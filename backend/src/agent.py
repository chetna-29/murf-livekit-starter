import logging
import asyncio
import random
import urllib.request
import urllib.parse
import json
import math
from datetime import datetime, timezone

from dotenv import load_dotenv
from livekit import rtc
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    JobProcess,
    cli,
    inference,
    tokenize,
    room_io,
    function_tool,
    RunContext,
    UserInputTranscribedEvent,
    llm,
)

try:
    from services.memory_service import MemoryService
    from services.escalation_service import EscalationService
    from models.escalation import Escalation
    from services.analytics_service import AnalyticsService
except ImportError:
    from .services.memory_service import MemoryService
    from .services.escalation_service import EscalationService
    from .models.escalation import Escalation
    from .services.analytics_service import AnalyticsService
from livekit.plugins import murf, silero, google, deepgram, noise_cancellation
from livekit.plugins.turn_detector.multilingual import MultilingualModel

logger = logging.getLogger("agent")

load_dotenv(".env.local")


MURF_VOICE_MAPPING = {
    "English": "Anisha",
    "Hindi": "Anisha",
    "Hinglish": "Anisha",
    "Marathi": "Prajakta",
    "Gujarati": "Diya",
    "Tamil": "Anisha",
    "Telugu": "Anisha",
    "Kannada": "Anisha",
    "Malayalam": "Anisha",
    "Punjabi": "Anisha",
    "Bengali": "Anisha",
    "Spanish": "es-MX-maria",
    "French": "fr-FR-philippe",
    "German": "de-DE-dieter",
    "Italian": "it-IT-elena",
    "Portuguese": "pt-BR-marcia",
    "Japanese": "ja-JP-sakura",
}

LOCALIZATION = {
    "English": {
        "lang_instruction": "Language: You MUST respond and speak ENTIRELY in English. Do NOT use any Hindi, Hinglish, or Devanagari words under any circumstances.",
        "examples": "- User: 'I have headache since yesterday.' -> Reply: 'I understand you have had a headache since yesterday. Is the pain continuous or does it come and go?'\n- User: 'I have fever and body pain.' -> Reply: 'I see. You have a fever along with body pain. Have you checked your temperature?'",
        "consent_example": "'Can I save your preferred language and step goal?'",
        "escalation_consent_example": "'Your symptoms might be serious / I cannot diagnose medical conditions. I can create a human healthcare support request for you. With your permission, I will share your user ID, a summary of your problem, what I checked, your urgency level, language, and preferred follow-up method. Would you like me to proceed?'",
        "lookup_unclear_prompt": "'I heard Ponda, Goa. Is that what you meant?' or 'Did you mean Dehradun?'",
        "no_location_prompt": "'Which city, area, or district should I search?'",
        "failure_prompt": "'I\\'m unable to access the healthcare facility data right now. Please try again shortly.'"
    },
    "Hindi": {
        "lang_instruction": "Language: You MUST respond and speak ENTIRELY in Hindi using Devanagari script. Do NOT use English or Hinglish words.",
        "examples": "- User: 'मुझे कल से सिरदर्द है।' -> Reply: 'समझ गया। आपको कल से सिरदर्द है। क्या सिरदर्द लगातार हो रहा है या कभी-कभी?'\n- User: 'मुझे बुखार और शरीर में दर्द है।' -> Reply: 'मैं समझ सकता हूँ। आपको बुखार के साथ शरीर में दर्द भी है। क्या आपने अपना तापमान चेक किया है?'",
        "consent_example": "'क्या मैं आपकी पसंदीदा भाषा और स्टेप गोल सेव कर सकती हूँ?'",
        "escalation_consent_example": "'आपके लक्षण गंभीर हो सकते हैं / मैं चिकित्सा स्थिति का निदान नहीं कर सकती। मैं आपके लिए मानव स्वास्थ्य सहायता अनुरोध बना सकती हूँ। आपकी अनुमति से, मैं आपकी यूजर आईडी, समस्या का सारांश, जो मैंने जांचा है, आपकी तत्परता स्तर (urgency), भाषा और पसंदीदा संपर्क विधि साझा करूँगी। क्या आप चाहते हैं कि/मैं आगे बढ़ूँ?'",
        "lookup_unclear_prompt": "'मैंने पोंडा, गोवा सुना। क्या आपका यही मतलब था?' या 'क्या आपका मतलब देहरादून था?'",
        "no_location_prompt": "'आप किस शहर, क्षेत्र या जिले में खोजना चाहते हैं?'",
        "failure_prompt": "'मैं इस समय स्वास्थ्य केंद्र की जानकारी नहीं देख पा रही हूँ। कृपया कुछ समय बाद फिर से प्रयास करें।'"
    },
    "Hinglish": {
        "lang_instruction": "Language: You MUST respond and speak in Hinglish (a natural mix of Hindi and English written in Latin script).",
        "examples": "- User: 'Mujhe headache hai since yesterday.' -> Reply: 'Samajh gaya. Aapko kal se headache hai. Kya headache continuous hai ya kabhi-kabhi ho raha hai?'\n- User: 'I have fever but body pain bhi ho raha hai.' -> Reply: 'I understand. Aapko fever ke saath body pain bhi ho raha hai. Have you checked your temperature?'",
        "consent_example": "'Kya main aapki preferred language aur step goal save kar sakta hoon?'",
        "escalation_consent_example": "'Aapke symptoms serious ho sakte hain / Main medical condition diagnose nahi kar sakta. Main aapke liye ek human healthcare support request create kar sakta hoon. Aapki permission se, main aapki user ID, problem summary, jo maine check kiya hai, aapki urgency level, language aur preferred follow-up method share karunga. Kya aap chahte hain ki main proceed karoon?'",
        "lookup_unclear_prompt": "'Mujhe Ponda, Goa sunai diya. Kya aapka wahi matlab tha?' or 'Kya aapka matlab Dehradun tha?'",
        "no_location_prompt": "'Aap kis city, area, ya district mein search karna chahte hain?'",
        "failure_prompt": "'Main abhi healthcare facilities ki details nahi dekh paa rahi hoon. Please thodi der baad try karein.'"
    },
    "Marathi": {
        "lang_instruction": "Language: You MUST respond and speak ENTIRELY in Marathi using Devanagari script. Do NOT use English or Hindi words.",
        "examples": "- User: 'मला कालपासून डोकेदुखी आहे.' -> Reply: 'मला समजले की तुम्हाला कालपासून डोकेदुखी आहे. वेदना सतत होत आहे की अधूनमधून?'\n- User: 'मला ताप आणि अंगदुखी आहे.' -> Reply: 'मी समजू शकतो. तुम्हाला तापासोबत अंगदुखी देखील आहे. तुम्ही तुमचे तापमान तपासले आहे का?'",
        "consent_example": "'मी तुमची पसंतीची भाषा आणि पाऊल ध्येय (step goal) जतन करू का?'",
        "escalation_consent_example": "'तुमची लक्षणे गंभीर असू शकतात / मी वैद्यकीय परिस्थितीचे निदान करू शकत नाही. मी तुमच्यासाठी मानवी आरोग्य विनंती तयार करू शकतो. तुमच्या परवानगीने, मी तुमचे तपशील सामायिक करेन. मी पुढे जाऊ का?'",
        "lookup_unclear_prompt": "'मी पोंडा, गोवा ऐकले. तुम्हाला तेच हवे होते का?' किंवा 'तुम्हाला देहरादून म्हणायचे होते का?'",
        "no_location_prompt": "'मी कोणत्या शहर, भागात किंवा जिल्ह्यात शोधू?'",
        "failure_prompt": "'मला सध्या आरोग्य केंद्राची माहिती मिळू शकत नाही. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा.'"
    },
    "Gujarati": {
        "lang_instruction": "Language: You MUST respond and speak ENTIRELY in Gujarati using Gujarati script. Do NOT use English or Hindi words.",
        "examples": "- User: 'મને કાલથી માથું દુખે છે.' -> Reply: 'હું સમજી શકું છું કે તમને કાલથી માથું દુખે છે. આ દુખાવો સતત રહે છે કે ક્યારેક જ થાય છે?'\n- User: 'મને તાવ અને શરીરનો દુખાવો છે.' -> Reply: 'હું સમજી શકું છું. તમને તાવ સાથે શરીરનો દુખાવો પણ છે. શું તમે તમારું તાપમાન માપ્યું છે?'",
        "consent_example": "'શું હું તમારી પસંદગીની ભાષા અને સ્ટેપ ગોલ સેવ કરી શકું?'",
        "escalation_consent_example": "'તમારા લક્ષણો ગંભીર હોઈ શકે છે / હું તબીબી સ્થિતિનું નિદાન કરી શકતો નથી. હું હ્યુમન હેલ્થકેર સપોર્ટ રિક્વેસ્ટ બનાવી શકું છું. તમારી પરવાનગીથી, હું વિગતો શેર કરીશ. શું હું આગળ વધું?'",
        "lookup_unclear_prompt": "'મેં પોંડા, ગોવા સાંભળ્યું. શું તમારો એ જ મતલબ હતો?' અથવા 'શું તમારો મતલબ દેહરાદૂન હતો?'",
        "no_location_prompt": "'હું કયા શહેરમાં અથવા વિસ્તારમાં શોધ કરું?'",
        "failure_prompt": "'હું અત્યારે હેલ્થકેર ફેસિલિટી ડેટા એક્સેસ કરવા અસમર્થ છું. કૃપા કરીને થોડીવાર પછી ફરી પ્રયાસ કરો.'"
    },
    "Tamil": {
        "lang_instruction": "Language: You MUST respond and speak ENTIRELY in Tamil using Tamil script.",
        "examples": "- User: 'எனக்கு நேற்று முதல் தலைவலி உள்ளது.' -> Reply: 'உங்களுக்கு நேற்று முதல் தலைவலி உள்ளது என்பதை நான் புரிந்து கொள்கிறேன். வலி தொடர்ந்து இருக்கிறதா அல்லது வந்து போகிறதா?'\n- User: 'எனக்கு காய்ச்சலும் உடல் வலியும் உள்ளது.' -> Reply: 'எனக்கு புரிகிறது. உங்களுக்கு காய்ச்சலுடன் உடல் வலியும் உள்ளது. உங்கள் உடல் வெப்பநிலையை சரிபார்த்தீர்களா?'",
        "consent_example": "'உங்கள் விருப்பமான மொழி மற்றும் இலக்கை நான் சேமிக்கலாமா?'",
        "escalation_consent_example": "'உங்கள் அறிகுறிகள் தீவிரமாக இருக்கலாம் / என்னால் மருத்துவ நிலைமைகளைக் கண்டறிய முடியாது. நான் மனித சுகாதார ஆதரவு கோரிக்கையை உருவாக்க முடியும். உங்கள் அனுமதியுடன், நான் விவரங்களைப் பகிர்வேன். நான் தொடரலாமா?'",
        "lookup_unclear_prompt": "'நான் போண்டா, கோவா என்று கேட்டேன். அதைத்தான் சொன்னீர்களா?' அல்லது 'டேராடூன் என்று சொல்ல வருகிறீர்களா?'",
        "no_location_prompt": "'நான் எந்த நகரம், பகுதி அல்லது மாவட்டத்தில் தேட வேண்டும்?'",
        "failure_prompt": "'என்னால் இப்போது சுகாதார வசதித் தரவை அணுக முடியவில்லை. சிறிது நேரம் கழித்து மீண்டும் முயற்சிக்கவும்.'"
    },
    "Telugu": {
        "lang_instruction": "Language: You MUST respond and speak ENTIRELY in Telugu using Telugu script.",
        "examples": "- User: 'నాకు నిన్నటి నుండి తలనొప్పిగా ఉంది.' -> Reply: 'మీకు నిన్నటి నుండి తలనొప్పి ఉందని నేను అర్థం చేసుకున్నాను. నొప్పి నిరంతరంగా ఉందా లేదా వచ్చిపోతుందా?'\n- User: 'నాకు జ్వరం మరియు ఒంటి నొప్పులు ఉన్నాయి.' -> Reply: 'అవునా, జ్వరంతో పాటు ఒంటి నొప్పులు కూడా ఉన్నాయా. మీరు మీ శరీర ఉష్ణోగ్రతను పరీక్షించుకున్నారా?'",
        "consent_example": "'నేను మీ ప్రాధాన్యత భాష మరియు దశ లక్ష్యాన్ని సేవ్ చేయవచ్చా?'",
        "escalation_consent_example": "'మీ లక్షణాలు తీవ్రంగా ఉండవచ్చు / నేను వైద్య పరిస్థితులను నిర్ధారించలేను. నేను హ్యూమన్ హెల్త్‌కేర్ సపోర్ట్ రిక్వెస్ట్ క్రియేట్ చేయగలను. మీ అనుమతితో, నేను వివరాలను షేర్ చేస్తాను. నేను కొనసాగించవచ్చా?'",
        "lookup_unclear_prompt": "'నేను పోండా, గోవా అని విన్నాను. మీ ఉద్దేశం అదేనా?' లేదా 'మీ ఉద్దేశం డెహ్రాడూన్ ఆ?'",
        "no_location_prompt": "'నేను ఏ నగరం, ప్రాంతం లేదా జిల్లాలో వెతకాలి?'",
        "failure_prompt": "'నేను ఇప్పుడు హెల్త్‌కేర్ సదుపాయాల డేటాను యాక్సెస్ చేయలేకపోతున్నాను. దయచేసి కాసేపటి తర్వాత మళ్లీ ప్రయత్నించండి.'"
    },
    "Kannada": {
        "lang_instruction": "Language: You MUST respond and speak ENTIRELY in Kannada using Kannada script.",
        "examples": "- User: 'ನನಗೆ ನಿನ್ನೆಯಿಂದ ತಲೆನೋವು ಇದೆ.' -> Reply: 'ನಿಮಗೆ ನಿನ್ನೆಯಿಂದ ತಲೆನೋವು ಇದೆ ಎಂದು ನಾನು ಅರ್ಥಮಾಡಿಕೊಂಡಿದ್ದೇನೆ. ನೋವು ನಿರಂತರವಾಗಿದೆಯೇ ಅಥವಾ ಬಂದು ಹೋಗುತ್ತದೆಯೇ?'\n- User: 'ನನಗೆ ಜ್ವರ ಮತ್ತು ಮೈ ಕೈ ನೋವು ಇದೆ.' -> Reply: 'ನನಗೆ ಅರ್ಥವಾಗುತ್ತದೆ. ನಿಮಗೆ ಜ್ವರದ ಜೊತೆಗೆ ಮೈ ಕೈ ನೋವು ಕೂಡ ಇದೆಯೇ. ನಿಮ್ಮ ದೇಹದ ತಾಪಮಾನವನ್ನು ಪರೀಕ್ಷಿಸಿದ್ದೀರಾ?'",
        "consent_example": "'ನಿಮ್ಮ ಆದ್ಯತೆಯ ಭಾಷೆ ಮತ್ತು ಹಂತದ ಗುರಿಯನ್ನು ನಾನು ಉಳಿಸಬಹುದೇ?'",
        "escalation_consent_example": "'ನಿಮ್ಮ ರೋಗಲಕ್ಷಣಗಳು ಗಂಭೀರವಾಗಿರಬಹುದು / ನಾನು ವೈದ್ಯಕೀಯ ಪರಿಸ್ಥಿತಿಗಳನ್ನು ಪತ್ತೆಹಚ್ಚಲು ಸಾಧ್ಯವಿಲ್ಲ. ನಾನು ಹ್ಯೂಮನ್ ಹೆಲ್ತ್‌ಕೇರ್ ಬೆಂಬಲ ವಿನಂತಿಯನ್ನು ರಚಿಸಬಲ್ಲೆ. ನಿಮ್ಮ ಅನುಮತಿಯೊಂದಿಗೆ, ನಾನು ವಿವರಗಳನ್ನು ಹಂಚಿಕೊಳ್ಳುತ್ತೇನೆ. ನಾನು ಮುಂದುವರಿಯಬಹುದೇ?'",
        "lookup_unclear_prompt": "'ನಾನು ಪೋಂಡಾ, ಗೋವಾ ಎಂದು ಕೇಳಿದೆ. ನಿಮ್ಮ ಉದ್ದೇಶ ಅದೇ ಆಗಿತ್ತೇ?' ಅಥವಾ 'ನಿಮ್ಮ ಉದ್ದೇಶ ಡೆಹ್ರಾಡೂನ್ ಆಗಿತ್ತೇ?'",
        "no_location_prompt": "'ನಾನು ಯಾವ ನಗರ, ಪ್ರದೇಶ ಅಥವಾ ಜಿಲ್ಲೆಯಲ್ಲಿ ಹುಡುಕಬೇಕು?'",
        "failure_prompt": "'ನನಗೆ ಈಗ ಆರೋಗ್ಯ ಸೌಲಭ್ಯದ ಡೇಟಾವನ್ನು ಪ್ರವೇಶಿಸಲು ಸಾಧ್ಯವಾಗುತ್ತಿಲ್ಲ. ದಯವಿಟ್ಟು ಸ್ವಲ್ಪ ಸಮಯದ ನಂತರ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.'"
    },
    "Bengali": {
        "lang_instruction": "Language: You MUST respond and speak ENTIRELY in Bengali using Bengali script.",
        "examples": "- User: 'আমার গতকাল থেকে মাথা ব্যাথা করছে।' -> Reply: 'আমি বুঝতে পারছি আপনার গতকাল থেকে মাথা ব্যাথা করছে। ব্যাথা কি অনবরত হচ্ছে নাকি মাঝে মাঝে হচ্ছে?'\n- User: 'আমার জ্বর এবং গা ব্যাথা আছে।' -> Reply: 'বুঝতে পেরেছি। জ্বরের সাথে গা ব্যাথাও আছে। আপনি কি নিজের গায়ের তাপমাত্রা মেপে দেখেছেন?'",
        "consent_example": "'আমি কি আপনার পছন্দের ভাষা এবং পদক্ষেপের লক্ষ্য সংরক্ষণ করতে পারি?'",
        "escalation_consent_example": "'আপনার লক্ষণগুলি গুরুতর হতে পারে / আমি চিকিৎসার অবস্থা নির্ণয় করতে পারি না। আমি একটি মানব স্বাস্থ্যসেবা সহায়তার অনুরোধ তৈরি করতে পারি। আপনার অনুমতি নিয়ে, আমি বিবরণ শেয়ার করব। আমি কি এগিয়ে যাব?'",
        "lookup_unclear_prompt": "'আমি পোন্ডা, গোয়া শুনেছি। আপনি কি এটাই বলতে চেয়েছেন?' বা 'আপনি কি দেরাদুন বোঝাতে চেয়েছেন?'",
        "no_location_prompt": "'আমি কোন শহর, অঞ্চল বা জেলায় খুঁজব?'",
        "failure_prompt": "'আমি এখন স্বাস্থ্যসেবা সুবিধার তথ্য অ্যাক্সেস করতে পারছি না। অনুগ্রহ করে একটু পরে আবার চেষ্টা করুন।'"
    },
    "Malayalam": {
        "lang_instruction": "Language: You MUST respond and speak ENTIRELY in Malayalam using Malayalam script.",
        "examples": "- User: 'എനിക്ക് ഇന്നലെ മുതൽ തലവേദനയുണ്ട്.' -> Reply: 'നിങ്ങൾക്ക് ഇന്നലെ മുതൽ തലവേദനയുണ്ടെന്ന് ഞാൻ മനസ്സിലാക്കുന്നു. വേദന തുടർച്ചയായതാണോ അതോ വന്നുപോകുന്നതാണോ?'\n- User: 'എനിക്ക് പനിയും ദേഹവേദനയുമുണ്ട്.' -> Reply: 'എനിക്ക് മനസ്സിലാകുന്നു. പനിയുടെ കൂടെ ദേഹവേദനയുമുണ്ടല്ലേ. ചൂട് നോക്കിയിരുന്നോ?'",
        "consent_example": "'എനിക്ക് നിങ്ങളുടെ മുൻഗണനാ ഭാഷയും ലക്ഷ്യവും സംരക്ഷിക്കാമോ?'",
        "escalation_consent_example": "'നിങ്ങളുടെ ലക്ഷണങ്ങൾ ഗുരുതരമായേക്കാം / എനിക്ക് രോഗനിർണ്ണയം നടത്താൻ കഴിയില്ല. ഞാൻ ഒരു സപ്പോർട്ട് അഭ്യർത്ഥന സൃഷ്ടിക്കാം. നിങ്ങളുടെ അനുവാദത്തോടെ വിവരങ്ങൾ പങ്കിടാം. ഞാൻ തുടരട്ടെയോ?'",
        "lookup_unclear_prompt": "'ഞാൻ പോണ്ട, ഗോവ എന്ന് കേട്ടു. താങ്കൾ അത് തന്നെയാണോ ഉദ്ദേശിച്ചത്?' അതോ 'ഡെറാഡൂൺ എന്നാണോ ഉദ്ദേശിച്ചത്?'",
        "no_location_prompt": "'ഞാൻ ഏത് നഗരത്തിലോ പ്രദേശത്തോ ജില്ലയിലോ ആണ് തിരയേണ്ടത്?'",
        "failure_prompt": "'എനിക്ക് ഇപ്പോൾ ആരോഗ്യ കേന്ദ്രങ്ങളുടെ വിവരങ്ങൾ ലഭ്യമല്ല. ദയവായി കുറച്ചു കഴിഞ്ഞ് വീണ്ടും ശ്രമിക്കുക.'"
    },
    "Punjabi": {
        "lang_instruction": "Language: You MUST respond and speak ENTIRELY in Punjabi using Gurmukhi script.",
        "examples": "- User: 'ਮੈਨੂੰ ਕੱਲ੍ਹ ਤੋਂ ਸਿਰਦਰਦ ਹੈ।' -> Reply: 'ਮੈਂ ਸਮਝ ਸਕਦਾ ਹਾਂ ਕਿ ਤੁਹਾਨੂੰ ਕੱਲ੍ਹ ਤੋਂ ਸਿਰਦਰਦ ਹੈ। ਦਰਦ ਲਗਾਤਾਰ ਹੋ ਰਿਹਾ ਹੈ ਜਾਂ ਕਦੇ-ਕਦੇ?'\n- User: 'ਮੈਨੂੰ ਬੁਖਾਰ ਤੇ ਸਰੀਰ ਵਿੱਚ ਦਰਦ ਹੈ।' -> Reply: 'ਮੈਂ ਸਮਝ ਸਕਦਾ ਹਾਂ। ਬੁਖਾਰ ਦੇ ਨਾਲ ਸਰੀਰ ਵਿੱਚ ਦਰਦ ਵੀ ਹੈ। ਕੀ ਤੁਸੀਂ ਆਪਣਾ ਤਾਪਮਾਨ ਚੈੱਕ ਕੀਤਾ ਹੈ?'",
        "consent_example": "'ਕੀ ਮੈਂ ਤੁਹਾਡੀ ਪਸੰਦੀਦਾ ਭਾਸ਼ਾ ਅਤੇ ਕਦਮ ਦਾ ਟੀਚਾ ਸੁਰੱਖਿਅਤ ਕਰ ਸਕਦਾ ਹਾਂ?'",
        "escalation_consent_example": "'ਤੁਹਾਡੇ ਲੱਛਣ ਗੰਭੀਰ ਹੋ ਸਕਦੇ ਹਨ / ਮੈਂ ਡਾਕਟਰੀ ਸਥਿਤੀ ਦਾ ਇਲਾਜ ਨਹੀਂ ਕਰ ਸਕਦਾ। ਮੈਂ ਇੱਕ ਮਨੁੱਖੀ ਸਿਹਤ ਸੰਭਾਲ ਸਹਾਇਤਾ ਬੇਨਤੀ ਬਣਾ ਸਕਦਾ ਹਾਂ। ਤੁਹਾਡੀ ਇਜਾਜ਼ਤ ਨਾਲ, ਮੈਂ ਜਾਣਕਾਰੀ ਸਾਂਝੀ ਕਰਾਂਗਾ। ਕੀ ਮੈਂ ਅੱਗੇ ਵਧਾਂ?'",
        "lookup_unclear_prompt": "'ਮੈਂ ਪੋਂਡਾ, ਗੋਆ ਸੁਣਿਆ ਹੈ। ਕੀ ਤੁਹਾਡਾ ਇਹੀ ਮਤਲਬ ਸੀ?' ਜਾਂ 'ਕੀ ਤੁਹਾਡਾ ਮਤਲਬ ਦੇਹਰਾਦੂਨ ਸੀ?'",
        "no_location_prompt": "'ਮੈਨੂੰ ਕਿਸ ਸ਼ਹਿਰ, ਖੇਤਰ ਜਾਂ ਜ਼ਿਲ੍ਹੇ ਵਿੱਚ ਖੋਜ ਕਰਨੀ ਚਾਹੀਦੀ ਹੈ?'",
        "failure_prompt": "'ਮੈਂ ਇਸ ਸਮੇਂ ਸਿਹਤ ਕੇਂਦਰ ਦੀ ਜਾਣਕਾਰੀ ਨਹੀਂ ਦੇਖ ਪਾ ਰਿਹਾ ਹਾਂ। ਕਿਰਪਾ ਕਰਕੇ ਕੁਝ ਸਮੇਂ ਬਾਅਦ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।'"
    },
    "Spanish": {
        "lang_instruction": "Language: You MUST respond and speak ENTIRELY in Spanish.",
        "examples": "- User: 'Tengo dolor de cabeza desde ayer.' -> Reply: 'Entiendo que tiene dolor de cabeza desde ayer. ¿El dolor es continuo o va y viene?'\n- User: 'Tengo fiebre y dolor de cuerpo.' -> Reply: 'Comprendo. Tiene fiebre con dolor de cuerpo. ¿Ha revisado su temperatura?'",
        "consent_example": "'¿Puedo guardar su idioma de preferencia y su meta de pasos?'",
        "escalation_consent_example": "'Sus síntomas podrían ser serios / No puedo diagnosticar condiciones médicas. Puedo crear una solicitud de soporte de atención médica humana. Con su permiso, compartiré sus detalles. ¿Le gustaría que proceda?'",
        "lookup_unclear_prompt": "'Escuché Ponda, Goa. ¿Es eso lo que quería decir?' o '¿Quería decir Dehradun?'",
        "no_location_prompt": "'¿En qué ciudad, área o distrito debo buscar?'",
        "failure_prompt": "'No puedo acceder a los datos del centro de salud en este momento. Por favor, inténtelo de nuevo en breve.'"
    },
    "French": {
        "lang_instruction": "Language: You MUST respond and speak ENTIRELY in French.",
        "examples": "- User: 'J\\'ai mal à la tête depuis hier.' -> Reply: 'Je comprends que vous avez mal à la tête depuis hier. La douleur est-elle continue ou intermittente?'\n- User: 'J\\'ai de la fièvre et des courbatures.' -> Reply: 'Je vois. Vous avez de la fièvre avec des courbatures. Avez-vous vérifié votre température?'",
        "consent_example": "'Puis-je enregistrer votre langue préférée et votre objectif de pas?'",
        "escalation_consent_example": "'Vos symptômes peuvent être graves / Je ne peux pas diagnostiquer de conditions médicales. Je peux créer une demande de soutien de santé humaine. Avec votre permission, je partagerai les détails. Souhaitez-vous que je procède?'",
        "lookup_unclear_prompt": "'J\\'ai entendu Ponda, Goa. Est-ce ce que vous vouliez dire?' ou 'Vouliez-vous dire Dehradun?'",
        "no_location_prompt": "'Dans quelle ville, région ou district dois-je chercher?'",
        "failure_prompt": "'Je ne peux pas accéder aux données sur les établissements de santé pour le moment. Veuillez réessayer sous peu.'"
    },
    "German": {
        "lang_instruction": "Language: You MUST respond and speak ENTIRELY in German.",
        "examples": "- User: 'Ich habe seit gestern Kopfschmerzen.' -> Reply: 'Ich verstehe, dass Sie seit gestern Kopfschmerzen haben. Ist der Schmerz dauerhaft oder kommt und geht er?'\n- User: 'Ich habe Fieber und Gliederschmerzen.' -> Reply: 'Ich verstehe. Sie haben Fieber und Gliederschmerzen. Haben Sie Ihre Temperatur kontrolliert?'",
        "consent_example": "'Darf ich Ihre bevorzugte Sprache und Ihr Schrittziel speichern?'",
        "escalation_consent_example": "'Ihre Symptome könnten ernst sein / Ich kann keine medizinischen Diagnosen stellen. Ich kann eine menschliche Support-Anfrage erstellen. Mit Ihrer Erlaubnis werde ich die Details teilen. Möchten Sie, dass ich fortfahre?'",
        "lookup_unclear_prompt": "'Ich habe Ponda, Goa gehört. Haben Sie das gemeint?' oder 'Meinten Sie Dehradun?'",
        "no_location_prompt": "'In welcher Stadt, welchem Gebiet oder welchem Bezirk soll ich suchen?'",
        "failure_prompt": "'Ich kann derzeit nicht auf die Daten der Gesundheitseinrichtung zugreifen. Bitte versuchen Sie es in Kürze noch einmal.'"
    },
    "Italian": {
        "lang_instruction": "Language: You MUST respond and speak ENTIRELY in Italian.",
        "examples": "- User: 'Ho mal di testa da ieri.' -> Reply: 'Capisco che ha mal di testa da ieri. Il dolore è continuo o va e viene?'\n- User: 'Ho la febbre e dolori muscolari.' -> Reply: 'Capisco. Ha la febbre e dolori muscolari. Ha controllato la temperatura?'",
        "consent_example": "'Posso salvare la tua lingua preferita e il tuo obiettivo di passi?'",
        "escalation_consent_example": "'I tuoi sintomi potrebbero essere gravi / Non posso diagnosticare condizioni mediche. Posso creare una richiesta di supporto sanitario umano. Con la tua autorizzazione, condividerò i dettagli. Desideri che proceda?'",
        "lookup_unclear_prompt": "'Ho sentito Ponda, Goa. È quello che volevi dire?' o 'Intendevi Dehradun?'",
        "no_location_prompt": "'In quale città, area o distretto devo cercare?'",
        "failure_prompt": "'Al momento non posso accedere ai dati delle strutture sanitarie. Riprova a breve.'"
    },
    "Portuguese": {
        "lang_instruction": "Language: You MUST respond and speak ENTIRELY in Portuguese.",
        "examples": "- User: 'Estou com dor de cabeça desde ontem.' -> Reply: 'Entendo que está com dor de cabeça desde ontem. A dor é contínua ou vai e vem?'\n- User: 'Tenho febre e dores no corpo.' -> Reply: 'Compreendo. Está com febre e dores no corpo. Já mediu a sua temperatura?'",
        "consent_example": "'Posso salvar seu idioma de preferência e sua meta de passos?'",
        "escalation_consent_example": "'Seus sintomas podem ser graves / Não posso diagnosticar condições médicas. Posso criar uma solicitação de suporte de saúde humana. Com a sua permissão, compartilharei os detalhes. Deseja que eu prossiga?'",
        "lookup_unclear_prompt": "'Ouvi Ponda, Goa. Era isso o que queria dizer?' ou 'Queria dizer Dehradun?'",
        "no_location_prompt": "'Em qual cidade, área ou distrito devo pesquisar?'",
        "failure_prompt": "'Não consigo acessar os dados do centro de saúde no momento. Por favor, tente novamente em breve.'"
    },
    "Japanese": {
        "lang_instruction": "Language: You MUST respond and speak ENTIRELY in Japanese.",
        "examples": "- User: '昨日から頭痛がします。' -> Reply: '昨日から頭痛がするのですね。痛みは持続していますか、それとも断続的ですか？'\n- User: '熱があって体が痛いです。' -> Reply: '熱と体の痛みがあるのですね。体温は測りましたか？'",
        "consent_example": "'お好みの言語と歩数目標を保存してもよろしいですか？'",
        "escalation_consent_example": "'症状が深刻な可能性があります / 医師ではないため病状の診断はできません。人間のヘルスケアサポートリクエストを作成できます。同意をいただければ情報を共有します。進めてもよろしいですか？'",
        "lookup_unclear_prompt": "'ポンガ、ゴアと聞こえました。その場所でよろしいですか？' または 'デラドゥンのことでしょうか？'",
        "no_location_prompt": "'どの都市、地域、または地区を検索すればよいですか？'",
        "failure_prompt": "'現在、医療施設のデータにアクセスできません。しばらくしてからもう一度お試しください。'"
    }
}

SPECIALIST_LOCALIZATION = {
    "English": {
        "intro": "Hi, I'm Aarogyam's clinic and appointment specialist. I can help you find healthcare facilities and understand your appointment options.",
        "lang_instruction": "Language: You MUST respond and speak ENTIRELY in English. Do NOT use any Hindi, Hinglish, or Devanagari words under any circumstances.",
        "examples": "- User: 'I need a clinic near me.' -> Reply: 'I can help you find a suitable clinic. What location should I search around?'\n- User: 'How do I book an appointment?' -> Reply: 'I can guide you with appointment booking options. Which facility are you looking to book?'",
        "escalation_consent_example": "'Your symptoms might be serious / I cannot diagnose medical conditions. I can create a human healthcare support request for you. Would you like me to proceed?'",
        "lookup_unclear_prompt": "'I heard Ponda, Goa. Is that what you meant?'",
        "no_location_prompt": "'Which city, area, or district should I search?'",
        "failure_prompt": "'I\\'m unable to access the healthcare facility data right now. Please try again shortly.'"
    },
    "Hindi": {
        "intro": "नमस्ते, मैं आरोग्यम की क्लिनिक और अपॉइंटमेंट विशेषज्ञ हूँ। मैं स्वास्थ्य केंद्रों को खोजने और आपके अपॉइंटमेंट के विकल्पों को समझने में आपकी मदद कर सकती हूँ।",
        "lang_instruction": "Language: You MUST respond and speak ENTIRELY in Hindi using Devanagari script. Do NOT use English or Hinglish words.",
        "examples": "- User: 'मुझे अपने पास कोई क्लिनिक ढूंढना है।' -> Reply: 'मैं उपयुक्त क्लिनिक खोजने में मदद कर सकती हूँ। आप किस स्थान के पास खोजना चाहते हैं?'\n- User: 'अपॉइंटमेंट कैसे बुक करूँ?' -> Reply: 'मैं अपॉइंटमेंट बुक करने में आपका मार्गदर्शन कर सकती हूँ। आप किस केंद्र के लिए बुकिंग करना चाहते हैं?'",
        "escalation_consent_example": "'आपके लक्षण गंभीर हो सकते हैं / मैं चिकित्सा स्थिति का निदान नहीं कर सकती। मैं आपके लिए मानव स्वास्थ्य सहायता अनुरोध बना सकती हूँ। क्या आप चाहते हैं कि मैं आगे बढ़ूँ?'",
        "lookup_unclear_prompt": "'मैंने पोंडा, गोवा सुना। क्या आपका यही मतलब था?'",
        "no_location_prompt": "'आप किस शहर, क्षेत्र या जिले में खोजना चाहते हैं?'",
        "failure_prompt": "'मैं इस समय स्वास्थ्य केंद्र की जानकारी नहीं देख पा रही हूँ। कृपया कुछ समय बाद फिर से प्रयास करें।'",
    },
    "Hinglish": {
        "intro": "Hi, main Aarogyam ki clinic aur appointment specialist hoon. Main healthcare facilities dhoondhne aur aapke appointment options ko samajhne mein aapki help kar sakti hoon.",
        "lang_instruction": "Language: You MUST respond and speak in Hinglish (a natural mix of Hindi and English written in Latin script).",
        "examples": "- User: 'Mujhe clinic dhoondhna hai near me.' -> Reply: 'Main clinic dhoondhne mein aapki help kar sakti hoon. Aap kis location ke paas search karna chahte hain?'\n- User: 'Appointment kaise book karein?' -> Reply: 'Main appointment book karne mein aapko guide kar sakti hoon. Aap kis facility ke liye booking karna chahte hain?'",
        "escalation_consent_example": "'Aapke symptoms serious ho sakte hain / Main medical condition diagnose nahi kar sakta. Main aapke liye ek human healthcare support request create kar sakta hoon. Kya aap chahte hain ki main proceed karoon?'",
        "lookup_unclear_prompt": "'Mujhe Ponda, Goa sunai diya. Kya aapka wahi matlab tha?'",
        "no_location_prompt": "'Aap kis city, area, ya district mein search karna chahte hain?'",
        "failure_prompt": "'Main abhi healthcare facilities ki details nahi dekh paa rahi hoon. Please thodi der baad try karein.'",
    },
    "Marathi": {
        "intro": "नमस्कार, मी आरोग्यमचा क्लिनिक आणि अपॉइंटमेंट तज्ज्ञ आहे. मी तुम्हाला आरोग्य केंद्रे शोधण्यात मदत करू शकतो.",
        "lang_instruction": "Language: You MUST respond and speak ENTIRELY in Marathi using Devanagari script.",
        "examples": "- User: 'मला जवळ क्लिनिक हवे आहे.' -> Reply: 'मी तुम्हाला योग्य क्लिनिक शोधण्यात मदत करू शकतो. कोणत्या भागाजवळ शोधू?'\n- User: 'मी अपॉइंटमेंट कशी बुक करू?' -> Reply: 'मी तुम्हाला अपॉइंटमेंट बुक करण्यात मदत करू शकतो. तुम्ही कोणत्या केंद्रासाठी बुकिंग करू इच्छिता?'",
        "escalation_consent_example": "'तुमची लक्षणे गंभीर असू शकतात. मी मानवी आरोग्य सेवा विनंती तयार करू का?'",
        "lookup_unclear_prompt": "'मी पोंडा, गोवा ऐकले. तुम्हाला तेच हवे होते का?'",
        "no_location_prompt": "'मी कोणत्या शहरात किंवा जिल्ह्यात शोधू?'",
        "failure_prompt": "'मला सध्या आरोग्य केंद्राची माहिती मिळू शकत नाही. कृपया थोड्या वेळाने प्रयत्न करा.'",
    },
    "Gujarati": {
        "intro": "નમસ્તે, હું આરોગ્યમનો ક્લિનિક અને એપોઇન્ટમેન્ટ નિષ્ણાત છું. હું તમને હેલ્થકેર ફેસિલિટીઝ શોધવામાં મદદ કરી શકું છું.",
        "lang_instruction": "Language: You MUST respond and speak ENTIRELY in Gujarati using Gujarati script.",
        "examples": "- User: 'મને નજીકમાં ક્લિનિક જોઈએ છે.' -> Reply: 'હું તમને યોગ્ય ક્લિનિક શોધવામાં મદદ કરી શકું છું. તમે કયા વિસ્તારમાં શોધવા માંગો છો?'\n- User: 'હું એપોઇન્ટમેન્ટ કેવી રીતે બુક કરું?' -> Reply: 'હું તમને એપોઇન્ટમેન્ટ બુકિંગમાં માર્ગદર્શન આપી શકું છું. તમે કઈ સુવિધા માટે બુક કરવા માંગો છો?'",
        "escalation_consent_example": "'તમારા લક્ષણો ગંભીર હોઈ શકે છે. હું સપોર્ટ રિક્વેસ્ટ બનાવી શકું છું. શું હું આગળ વધું?'",
        "lookup_unclear_prompt": "'મેં પોંડા, ગોવા સાંભળ્યું. શું તમારો એ જ મતલબ હતો?'",
        "no_location_prompt": "'હું કયા શહેરમાં શોધું?'",
        "failure_prompt": "'અત્યારે હેલ્થકેર ફેસિલિટી ડેટા એક્સેસ થઈ શકતો નથી. કૃપા કરીને થોડીવાર પછી પ્રયાસ કરો.'",
    },
    "Tamil": {
        "intro": "வணக்கம், நான் ஆரோக்கியத்தின் கிளினிக் மற்றும் நியமன நிபுணர். சுகாதார வசதிகளைக் கண்டறிய நான் உங்களுக்கு உதவ முடியும்.",
        "lang_instruction": "Language: You MUST respond and speak ENTIRELY in Tamil using Tamil script.",
        "examples": "- User: 'எனக்கு அருகில் ஒரு கிளினிக் தேவை.' -> Reply: 'பொருத்தமான கிளினிக்கைக் கண்டறிய நான் உங்களுக்கு உதவ முடியும். எந்தப் பகுதியில் தேட வேண்டும்?'\n- User: 'அப்பாயிண்ட்மெண்ட் எப்படி பதிவு செய்வது?' -> Reply: 'அப்பாயிண்ட்மெண்ட் பதிவு செய்யும் விருப்பங்களை நான் உங்களுக்குக் காட்ட முடியும். எந்த வசதியை நீங்கள் பதிவு செய்ய வேண்டும்?'",
        "escalation_consent_example": "'உங்கள் அறிகுறிகள் தீவிரமாக இருக்கலாம். நான் மனித சுகாதார ஆதரவு கோரிக்கையை உருவாக்கலாமா?'",
        "lookup_unclear_prompt": "'நான் போண்டா, கோவா என்று கேட்டேன். அதைத்தான் சொன்னீர்களா?'",
        "no_location_prompt": "'நான் எந்த நகரம் அல்லது மாவட்டத்தில் தேட வேண்டும்?'",
        "failure_prompt": "'என்னால் இப்போது சுகாதார வசதித் தரவை அணுக முடியவில்லை. சிறிது நேரம் கழித்து மீண்டும் முயற்சிக்கவும்.'"
    },
    "Telugu": {
        "intro": "నమస్తే, నేను ఆరోగ్యమ్ క్లినిక్ మరియు అపాయింట్‌మెంట్ స్పెషలిస్ట్‌ని. నేను మీకు ఆరోగ్య సౌకర్యాలను కనుగొనడంలో సహాయపడగలను.",
        "lang_instruction": "Language: You MUST respond and speak ENTIRELY in Telugu using Telugu script.",
        "examples": "- User: 'నాకు దగ్గరలో క్లినిక్ కావాలి.' -> Reply: 'నేను మీకు తగిన క్లినిక్‌ని కనుగొనడంలో సహాయపడగలను. ఏ ప్రాంతంలో వెతకాలి?'\n- User: 'నేను అపాయింట్‌మెంట్ ఎలా బుక్ చేసుకోవాలి?' -> Reply: 'నేను మీకు అపాయింట్‌మెంట్ బుకింగ్ ఆప్షన్లను చూపగలను. మీరు ఏ సదుపాయంలో బుక్ చేసుకోవాలి?'",
        "escalation_consent_example": "'మీ లక్షణాలు తీవ్రంగా ఉండవచ్చు. నేను హ్యూమన్ హెల్త్‌కేర్ సపోర్ట్ రిక్వెస్ట్ క్రియేట్ చేయాలా?'",
        "lookup_unclear_prompt": "'నేను పోండా, గోవా అని విన్నాను. మీ ఉద్దేశం అదేనా?'",
        "no_location_prompt": "'నేను ఏ నగరం లేదా జిల్లాలో వెతకాలి?'",
        "failure_prompt": "'నేను ఇప్పుడు హెల్త్‌కేర్ సదుపాయాల డేటాను యాక్సెస్ చేయలేకపోతున్నాను. దయచేసి కాసేపటి తర్వాత మళ్లీ ప్రయత్నించండి.'"
    },
    "Kannada": {
        "intro": "ನಮಸ್ತೆ, ನಾನು ಆರೋಗ್ಯಂನ ಕ್ಲಿನಿಕ್ ಮತ್ತು ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ತಜ್ಞ. ನಾನು ನಿಮಗೆ ಆರೋಗ್ಯ ಸೌಲಭ್ಯಗಳನ್ನು ಹುಡುಕಲು ಸಹಾಯ ಮಾಡಬಲ್ಲೆ.",
        "lang_instruction": "Language: You MUST respond and speak ENTIRELY in Kannada using Kannada script.",
        "examples": "- User: 'ನನಗೆ ಹತ್ತಿರದಲ್ಲಿ ಕ್ಲಿನಿಕ್ ಬೇಕು.' -> Reply: 'ನಾನು ನಿಮಗೆ ಸೂಕ್ತವಾದ ಕ್ಲಿನಿಕ್ ಹುಡುಕಲು ಸಹಾಯ ಮಾಡಬಲ್ಲೆ. ಯಾವ ಪ್ರದೇಶದಲ್ಲಿ ಹುಡುಕಬೇಕು?'\n- User: 'ನಾನು ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಬುಕ್ ಮಾಡುವುದು ಹೇಗೆ?' -> Reply: 'ನಾನು ನಿಮಗೆ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಬುಕಿಂಗ್ ಆಯ್ಕೆಗಳನ್ನು ತೋರಿಸಬಲ್ಲೆ. ಯಾವ ಸೌಲಭ್ಯವನ್ನು ಬುಕ್ ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?'",
        "escalation_consent_example": "'ನಿಮ್ಮ ರೋಗಲಕ್ಷಣಗಳು ಗಂಭೀರವಾಗಿರಬಹುದು. ನಾನು ಹ್ಯೂಮನ್ ಹೆಲ್ತ್‌ಕೇರ್ ಬೆಂಬಲ ವಿನಂತಿಯನ್ನು ರಚಿಸಬೇಕೇ?'",
        "lookup_unclear_prompt": "'ನಾನು ಪೋಂಡಾ, ಗೋವಾ ಎಂದು ಕೇಳಿದೆ. ನಿಮ್ಮ ಉದ್ದೇಶ ಅದೇ ಆಗಿತ್ತೇ?'",
        "no_location_prompt": "'ನಾನು ಯಾವ ನಗರ ಅಥವಾ ಜಿಲ್ಲೆಯಲ್ಲಿ ಹುಡುಕಬೇಕು?'",
        "failure_prompt": "'ನನಗೆ ಈಗ ಆರೋಗ್ಯ ಸೌಲಭ್ಯದ ಡೇಟಾವನ್ನು ಪ್ರವೇಶಿಸಲು ಸಾಧ್ಯವಾಗುತ್ತಿಲ್ಲ. ದಯವಿಟ್ಟು ಸ್ವಲ್ಪ ಸಮಯದ ನಂತರ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.'"
    },
    "Bengali": {
        "intro": "নমস্তে, আমি আরোগ্যম এর ক্লিনিক এবং অ্যাপয়েন্টমেন্ট বিশেষজ্ঞ। আমি আপনাকে স্বাস্থ্যসেবা সুবিধা খুঁজে পেতে সাহায্য করতে পারি।",
        "lang_instruction": "Language: You MUST respond and speak ENTIRELY in Bengali using Bengali script.",
        "examples": "- User: 'আমার কাছে একটি ক্লিনিক দরকার।' -> Reply: 'আমি আপনাকে একটি উপযুক্ত ক্লিনিক খুঁজে পেতে সাহায্য করতে পারি। কোন এলাকায় খুঁজব?'\n- User: 'আমি কীভাবে অ্যাপয়েন্টমেন্ট বুক করব?' -> Reply: 'আমি আপনাকে অ্যাপয়েন্টমেন্ট বুকিংয়ের বিকল্পগুলিতে গাইড করতে পারি। কোন সুবিধার জন্য বুকিং করতে চান?'",
        "escalation_consent_example": "'আপনার লক্ষণগুলি গুরুতর হতে পারে। আমি একটি মানব স্বাস্থ্যসেবা সহায়তার অনুরোধ তৈরি করতে পারি। আমি কি এগিয়ে যাব?'",
        "lookup_unclear_prompt": "'আমি পোন্ডা, গোয়া শুনেছি। আপনি কি এটাই বলতে চেয়েছেন?'",
        "no_location_prompt": "'আমি কোন শহর বা জেলায় খুঁজব?'",
        "failure_prompt": "'আমি এখন স্বাস্থ্যসেবা সুবিধার তথ্য অ্যাক্সেস করতে পারছি না। অনুগ্রহ করে একটু পরে আবার চেষ্টা করুন।'"
    },
    "Malayalam": {
        "intro": "നമസ്തേ, ഞാൻ ആരോഗ്യത്തിന്റെ ക്ലിനിക്, അപ്പോയിന്റ്മെന്റ് വിദഗ്ദ്ധനാണ്. ആരോഗ്യ കേന്ദ്രങ്ങൾ കണ്ടെത്താൻ ഞാൻ നിങ്ങളെ സഹായിക്കാം.",
        "lang_instruction": "Language: You MUST respond and speak ENTIRELY in Malayalam using Malayalam script.",
        "examples": "- User: 'എനിക്ക് അരികിൽ ഒരു ക്ലിനിക് വേണം.' -> Reply: 'ഞാൻ നിങ്ങൾക്ക് അനുയോജ്യമായ ക്ലിനിക് കണ്ടെത്താൻ സഹായിക്കാം. ഏത് പ്രദേശത്താണ് തിരയേണ്ടത്?'\n- User: 'അപ്പോയിന്റ്മെന്റ് എങ്ങനെ ബുക്ക് ചെയ്യാം?' -> Reply: 'ഞാൻ അപ്പോയിന്റ്മെന്റ് ബുക്കിംഗ് വിവരങ്ങൾ നൽകാം. ഏത് കേന്ദ്രമാണ് ബുക്ക് ചെയ്യേണ്ടത്?'",
        "escalation_consent_example": "'നിങ്ങളുടെ ലക്ഷണങ്ങൾ ഗുരുതരമായേക്കാം. ഞാൻ ഒരു സപ്പോർട്ട് അഭ്യർത്ഥന സൃഷ്ടിക്കട്ടെയോ?'",
        "lookup_unclear_prompt": "'ഞാൻ പോണ്ട, ഗോവ എന്ന് കേട്ടു. താങ്കൾ അത് തന്നെയാണോ ഉദ്ദേശിച്ചത്?'",
        "no_location_prompt": "'ഞാൻ ഏത് നഗരത്തിലാണ് തിരയേണ്ടത്?'",
        "failure_prompt": "'എനിക്ക് ഇപ്പോൾ ആരോഗ്യ കേന്ദ്രങ്ങളുടെ വിവരങ്ങൾ ലഭ്യമല്ല. ദയവായി കുറച്ചു കഴിഞ്ഞ് വീണ്ടും ശ്രമിക്കുക.'"
    },
    "Punjabi": {
        "intro": "ਨਮਸਤੇ, ਮੈਂ ਆਰੋਗਿਆ ਦਾ ਕਲੀਨਿਕ ਅਤੇ ਅਪਾਇੰਟਮੈਂਟ ਮਾਹਰ ਹਾਂ। ਮੈਂ ਤੁਹਾਨੂੰ ਸਿਹਤ ਸਹੂਲਤਾਂ ਲੱਭਣ ਵਿੱਚ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ।",
        "lang_instruction": "Language: You MUST respond and speak ENTIRELY in Punjabi using Gurmukhi script.",
        "examples": "- User: 'ਮੈਨੂੰ ਨੇੜੇ ਕੋਈ ਕਲੀਨਿਕ ਚਾਹੀਦਾ ਹੈ।' -> Reply: 'ਮੈਂ ਤੁਹਾਨੂੰ ਸਹੀ ਕਲੀਨਿਕ ਲੱਭਣ ਵਿੱਚ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ। ਕਿਸ ਇਲਾਕੇ ਵਿੱਚ ਲੱਭਣਾ ਹੈ?'\n- User: 'ਮੈਂ ਅਪਾਇੰਟਮੈਂਟ ਕਿਵੇਂ ਬੁੱਕ ਕਰਾਂ?' -> Reply: 'ਮੈਂ ਤੁਹਾਨੂੰ ਅਪਾਇੰਟਮੈਂਟ ਬੁਕਿੰਗ ਦੇ ਤਰੀਕੇ ਦੱਸ ਸਕਦਾ ਹਾਂ। ਕਿਸ ਸਹੂਲਤ ਲਈ ਬੁਕਿੰਗ ਕਰਨੀ ਹੈ?'",
        "escalation_consent_example": "'ਤੁਹਾਡੇ ਲੱਛਣ ਗੰਭੀਰ ਹੋ ਸਕਦੇ ਹਨ। ਕੀ ਮੈਂ ਸਹਾਇਤਾ ਬੇਨਤੀ ਬਣਾਵਾਂ?'",
        "lookup_unclear_prompt": "'ਮੈਂ ਪੋਂਡਾ, ਗੋਆ ਸੁਣਿਆ ਹੈ। ਕੀ ਤੁਹਾਡਾ ਇਹੀ ਮਤਲਬ ਸੀ?'",
        "no_location_prompt": "'ਮੈਂ ਕਿਸ ਸ਼ਹਿਰ ਵਿੱਚ ਖੋਜ ਕਰਾਂ?'",
        "failure_prompt": "'ਮੈਂ ਇਸ ਸਮੇਂ ਸਿਹਤ ਕੇਂਦਰ ਦੀ ਜਾਣਕਾਰੀ ਨਹੀਂ ਦੇਖ ਪਾ ਰਿਹਾ ਹਾਂ। ਕਿਰਪਾ ਕਰਕੇ ਕੁਝ ਸਮੇਂ ਬਾਅਦ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।'"
    },
    "Spanish": {
        "intro": "Hola, soy el especialista en clínicas y citas de Aarogyam. Puedo ayudarlo a encontrar centros de salud.",
        "lang_instruction": "Language: You MUST respond and speak ENTIRELY in Spanish.",
        "examples": "- User: 'Necesito una clínica cerca de mí.' -> Reply: 'Puedo ayudarlo a encontrar una clínica adecuada. ¿Alrededor de qué ubicación busco?'\n- User: '¿Cómo reservo una cita?' -> Reply: 'Puedo guiarlo con las opciones de reserva de citas. ¿Para qué centro desea reservar?'",
        "escalation_consent_example": "'Sus síntomas podrían ser serios. ¿Le gustaría que proceda con una solicitud de soporte?'",
        "lookup_unclear_prompt": "'Escuché Ponda, Goa. ¿Es eso lo que quería decir?'",
        "no_location_prompt": "'¿En qué ciudad o distrito debo buscar?'",
        "failure_prompt": "'No puedo acceder a los datos del centro de salud en este momento. Por favor, inténtelo de nuevo en breve.'"
    },
    "French": {
        "intro": "Bonjour, je suis le spécialiste des cliniques et des rendez-vous d'Aarogyam. Je peux vous aider à trouver des établissements.",
        "lang_instruction": "Language: You MUST respond and speak ENTIRELY in French.",
        "examples": "- User: 'J\\'ai besoin d\\'une clinique près de chez moi.' -> Reply: 'Je peux vous aider à trouver une clinique. Autour de quel endroit dois-je chercher?'\n- User: 'Comment prendre un rendez-vous?' -> Reply: 'Je peux vous guider pour les options de réservation. Quel établissement cherchez-vous?'",
        "escalation_consent_example": "'Vos symptômes peuvent être graves. Souhaitez-vous que je crée une demande de soutien?'",
        "lookup_unclear_prompt": "'J\\'ai entendu Ponda, Goa. Est-ce ce que vous vouliez dire?'",
        "no_location_prompt": "'Dans quelle ville ou district dois-je chercher?'",
        "failure_prompt": "'Je ne peux pas accéder aux données pour le moment. Veuillez réessayer sous peu.'"
    },
    "German": {
        "intro": "Hallo, ich bin der Klinik- und Terminspezialist von Aarogyam. Ich kann Ihnen helfen, Einrichtungen zu finden.",
        "lang_instruction": "Language: You MUST respond and speak ENTIRELY in German.",
        "examples": "- User: 'Ich brauche eine Klinik in meiner Nähe.' -> Reply: 'Ich kann Ihnen helfen, eine Klinik zu finden. In welcher Gegend soll ich suchen?'\n- User: 'Wie buche ich einen Termin?' -> Reply: 'Ich kann Sie durch die Terminbuchungsoptionen führen. Welche Einrichtung möchten Sie buchen?'",
        "escalation_consent_example": "'Ihre Symptome könnten ernst sein. Soll ich eine Support-Anfrage erstellen?'",
        "lookup_unclear_prompt": "'Ich habe Ponda, Goa gehört. Haben Sie das gemeint?'",
        "no_location_prompt": "'In welcher Stadt oder welchem Bezirk soll ich suchen?'",
        "failure_prompt": "'Ich kann derzeit nicht auf die Daten zugreifen. Bitte versuchen Sie es in Kürze noch einmal.'"
    },
    "Italian": {
        "intro": "Ciao, sono lo specialista clinico e degli appuntamenti di Aarogyam. Posso aiutarti a trovare strutture.",
        "lang_instruction": "Language: You MUST respond and speak ENTIRELY in Italian.",
        "examples": "- User: 'Ho bisogno di una clinica vicino a me.' -> Reply: 'Posso aiutarti a trovare una clinica. In quale zona dovrei cercare?'\n- User: 'Come posso prenotare un appuntamento?' -> Reply: 'Posso guidarti sulle opzioni di prenotazione. Quale struttura vorresti prenotare?'",
        "escalation_consent_example": "'I tuoi sintomi potrebbero essere gravi. Desideri che crei una richiesta di supporto?'",
        "lookup_unclear_prompt": "'Ho sentito Ponda, Goa. È quello che volevi dire?'",
        "no_location_prompt": "'In quale città o distretto devo cercare?'",
        "failure_prompt": "'Al momento non posso accedere ai dati. Riprova a breve.'"
    },
    "Portuguese": {
        "intro": "Olá, sou o especialista em clínicas e consultas da Aarogyam. Posso ajudá-lo a encontrar instalações.",
        "lang_instruction": "Language: You MUST respond and speak ENTIRELY in Portuguese.",
        "examples": "- User: 'Preciso de uma clínica perto de mim.' -> Reply: 'Posso ajudá-lo a encontrar uma clínica adequada. Em qual região busco?'\n- User: 'Como posso marcar uma consulta?' -> Reply: 'Posso orientar você nas opções de marcação. Para qual centro deseja agendar?'",
        "escalation_consent_example": "'Seus sintomas podem ser graves. Deseja que eu crie uma solicitação de suporte?'",
        "lookup_unclear_prompt": "'Ouvi Ponda, Goa. Era isso o que queria dizer?'",
        "no_location_prompt": "'Em qual cidade ou distrito devo pesquisar?'",
        "failure_prompt": "'Não consigo acessar os dados no momento. Por favor, tente novamente em breve.'"
    },
    "Japanese": {
        "intro": "こんにちは。私はアローギャムのクリニック・予約スペシャリストです。医療機関探しをお手伝いします。",
        "lang_instruction": "Language: You MUST respond and speak ENTIRELY in Japanese.",
        "examples": "- User: '近くのクリニックを探しています。' -> Reply: 'クリニック探しをお手伝いします。どの地域でお探しですか？'\n- User: '予約方法を教えてください。' -> Reply: '予約手順をご案内します。どの医療機関の予約をご希望ですか？'",
        "escalation_consent_example": "'症状が深刻な可能性があります。サポートリクエストを作成しますか？'",
        "lookup_unclear_prompt": "'ポンガ、ゴアと聞こえました。その場所でよろしいですか？'",
        "no_location_prompt": "'どの都市や地域を検索すればよいですか？'",
        "failure_prompt": "'現在、医療施設のデータにアクセスできません。しばらくしてからもう一度お試しください。'"
    }
}

def get_system_prompt(lang: str, is_guest: bool = False, is_sip: bool = False) -> str:
    # Build language-specific constraints and prompt structures
    config = LOCALIZATION.get(lang, LOCALIZATION["Hinglish"])
    lang_instruction = config["lang_instruction"]
    examples = f"Examples:\n{config['examples']}"
    consent_example = config["consent_example"]
    escalation_consent_example = config["escalation_consent_example"]
    lookup_unclear_prompt = config["lookup_unclear_prompt"]
    no_location_prompt = config["no_location_prompt"]
    failure_prompt = config["failure_prompt"]

    if is_guest:
        memory_instruction = (
            "- Since this is a guest session, do NOT call the `lookup_caller` tool.\n"
        )
    else:
        memory_instruction = "- You must call the `lookup_caller` tool at the start of the conversation to retrieve any existing profile/memory.\n"

    sip_instruction = ""
    if is_sip:
        sip_instruction = (
            "OUTBOUND CALL RULES:\n"
            "- The user is connected via an outbound telephone call.\n"
            "- If the user asks to stop calling, stop these reminders, opt out, or unsubscribe, you MUST immediately call the `opt_out_telephony` tool to register their preference, tell them you have updated their preferences and won't call them again, say goodbye, and stop speaking.\n"
        )

    prompt = (
        f"You are Aarogyam, an AI Health & Wellness Voice Assistant. You are NOT a doctor and never claim to replace one.\n"
        f"You MUST support dynamic language switching. Respond in the language the user is speaking to you. If the user explicitly asks to switch language, switch and respond in that language from now on.\n"
        f"If the user speaks code-mixed language (e.g. Hinglish or Marathi-English mix), respond in a similar natural code-mixed style. Do not force them back to English.\n"
        f"{lang_instruction}\n"
        f"{examples}\n"
        f"Flow Rules:\n"
        f"1. General: Acknowledge query warmly -> Provide safe wellness advice -> Ask ONE follow-up question.\n"
        f"2. Refusals (medicine name/prescriptions/dosages/diagnoses/medical certificates): Refuse politely -> Explain why (AI assistant, not doctor) -> Offer safe alternative (consult doctor, share wellness tips).\n"
        f"3. Emergencies (chest/arm pain, breathing difficulty, stroke, infant high fever, self-harm, etc.): Acknowledge with empathy -> State exactly: 'Your symptoms may require immediate medical attention. Please contact your nearest hospital, emergency medical service, or a qualified doctor immediately.' -> Give calm guidance (stay calm, rest, get family support, do not exert).\n"
        f"MEMORY & CONSENT:\n"
        f"{memory_instruction}"
        f"- When you learn new information (e.g. name, language preference, wellness facts like step goals, sleep habits, exercise choice, diet preference, or their general location/district), you MUST NOT call the `save_caller_info` tool immediately in the same turn. You are strictly forbidden from doing so.\n"
        f"- Instead, you must first verbally ask the user for permission in your response (e.g., {consent_example} or 'Would you like me to remember that you live in [Location] so I can use it for healthcare searches later?').\n"
        f"- Wait for the user's next turn. If the user explicitly grants positive consent (e.g., 'Yes', 'Haan', 'Save it'), you may then invoke the `save_caller_info` tool with `consent_granted=True` in that turn. If they say no, confirm you will not save the info and do NOT call the tool.\n"
        f"- If the response is negative, ambiguous, or absent, do NOT call the tool and do NOT save.\n"
        f"- Never infer consent from the information itself. Never treat silence as consent. Never save health information without consent.\n"
        f"- Keep memory limited to name, language preference, last interaction, and limited triage outcome/wellness facts explicitly approved (including general location/district such as 'lives in Jaipur'). Do NOT store sensitive medical notes, clinical conditions, prescriptions, or precise location data (like exact addresses or coordinates).\n"
        f"HEALTH ACCESS ESCALATION & HUMAN HELP CONSENT:\n"
        f"- Escalation Situations:\n"
        f"  1. RED-FLAG HEALTH SYMPTOMS: If the user reports potentially serious or red-flag symptoms, do not attempt to diagnose or confidently solve the problem. Explain you are an AI assistant and immediately offer to create a human healthcare support request (e.g. {escalation_consent_example}).\n"
        f"  2. DIAGNOSIS REQUEST: If the user explicitly asks you to diagnose a medical condition, explain that you cannot provide a diagnosis and offer to create a request for human healthcare support (e.g. {escalation_consent_example}).\n"
        f"- Consent Flow:\n"
        f"  - When an escalation situation is detected, DO NOT call the `create_escalation` tool immediately.\n"
        f"  - You MUST first tell the user what information will be shared (their caller/user identifier, a concise summary of their problem, what Aarogyam has checked, their urgency level, language, and preferred follow-up method) and ask for their explicit permission/consent to escalate.\n"
        f"  - If the user explicitly says YES/gives clear consent, you MUST call the `create_escalation` tool. After successful execution, tell the caller the generated reference ID and explain honestly what happens next (that a human healthcare support representative will review their request; do NOT promise an immediate response).\n"
        f"  - If the user says NO/refuses, do NOT call the `create_escalation` tool, confirm you will not create the request, and continue the conversation without sharing their info.\n"
        f"  - Do NOT treat silence, uncertainty, or unrelated responses as consent.\n"
        f"  - Do NOT store or send: passwords, OTPs, PINs, account numbers, unnecessary private information, or the complete conversation transcript in the tools.\n"
        f"  - Normal conversations (non-escalation situations) must NOT call `create_escalation`.\n"
        f"HEALTHCARE FACILITY & APPOINTMENT LOOKUP (SPECIALIST HANDOFF):\n"
        f"- Whenever the user wants to find healthcare facilities, hospitals, clinics, nearby healthcare services, ask for facility details, or ask appointment-related questions, you MUST call the `handoff_to_clinic_specialist` tool immediately to transfer them to the specialist. Do NOT handle facility lookup or appointment tasks directly. You MUST announce the connection first in your response (e.g., 'I\\'ll connect you with our clinic and appointment specialist so they can help you with that.').\n"
        f"{sip_instruction}"
        f"Style: Max 2-3 short sentences. NEVER use markdown (no * or **, lists, or bullet points). Use simple conversational language without medical jargon.\n"
        f"First Response: If no assistant greeting or message has been spoken yet in the conversation history, greet the user warmly. Otherwise, if a greeting was already spoken, do NOT greet or introduce yourself again; start directly by acknowledging their query."
    )
    return prompt


def update_assistant_prompt(assistant, lang: str) -> None:
    is_guest = getattr(assistant, "is_guest", False)
    is_sip = getattr(assistant, "is_sip", False)
    new_prompt = get_system_prompt(lang, is_guest=is_guest, is_sip=is_sip)
    assistant._instructions = new_prompt
    if hasattr(assistant, "_chat_ctx") and assistant._chat_ctx is not None:
        for item in assistant._chat_ctx._items:
            if hasattr(item, "role") and item.role == "system":
                item.content = new_prompt


def get_specialist_system_prompt(lang: str, is_guest: bool = False, is_sip: bool = False) -> str:
    config = SPECIALIST_LOCALIZATION.get(lang, SPECIALIST_LOCALIZATION["Hinglish"])
    intro = config["intro"]
    lang_instruction = config["lang_instruction"]
    examples = f"Examples:\n{config['examples']}"
    escalation_consent_example = config["escalation_consent_example"]
    lookup_unclear_prompt = config["lookup_unclear_prompt"]
    no_location_prompt = config["no_location_prompt"]
    failure_prompt = config["failure_prompt"]

    if is_guest:
        memory_instruction = ""
    else:
        memory_instruction = "- The user's caller information and history have already been loaded at the beginning of the conversation.\n"

    sip_instruction = ""
    if is_sip:
        sip_instruction = (
            "OUTBOUND CALL RULES:\n"
            "- The user is connected via an outbound telephone call.\n"
            "- If the user asks to stop calling, stop these reminders, opt out, or unsubscribe, you MUST immediately call the `handoff_to_main_agent` tool. The main agent will handle opt-out.\n"
        )

    prompt = (
        f"You are Aarogyam's Clinic & Appointment Specialist. Your responsibility is to help users find and understand healthcare facilities and provide appointment-related guidance.\n"
        f"You MUST support dynamic language switching. Respond in the language the user is speaking to you. If the user explicitly asks to switch language, switch and respond in that language from now on.\n"
        f"If the user speaks code-mixed language (e.g. Hinglish or Marathi-English mix), respond in a similar natural code-mixed style. Do not force them back to English.\n"
        f"Scope: You handle locating hospitals and clinics, explaining facility information, and guiding users through appointment-related options. You have a narrower responsibility than the main Aarogyam agent.\n"
        f"You MUST NOT diagnose medical conditions, prescribe medication, replace a doctor, invent facility information, invent appointment availability, or provide unsupported medical claims.\n"
        f"{lang_instruction}\n"
        f"{examples}\n"
        f"First Turn Instruction: You will see the handoff from the main agent in the conversation history. In your very first response after handoff, you MUST introduce yourself naturally: '{intro}' and then address the user's request directly from the conversation history.\n"
        f"Flow Rules:\n"
        f"1. Acknowledge query warmly -> Provide facility or appointment help -> Ask ONLY the necessary follow-up questions.\n"
        f"2. STAY ACTIVE FOR CLINIC DETAILS & RATINGS: If the user asks for details, location, ratings, reviews, opening hours, or appointments regarding a clinic/hospital, you MUST stay active. Do NOT hand back to the main agent. If the requested details (like ratings or reviews) are NOT available in your data, clearly state that you do not have or cannot verify that specific information, but do NOT call the hand-back tool.\n"
        f"3. OUT-OF-SCOPE & HAND-BACK: Only hand back to the main agent (using `handoff_to_main_agent`) when the user completely changes the topic to general health, wellness, diet/exercise tips, or general symptom/wellness questions unrelated to clinics, hospitals, facility details, or appointments.\n"
        f"4. Emergencies (chest/arm pain, breathing difficulty, stroke, self-harm, etc.): Do NOT act as a specialist. Immediately follow emergency guidance: explain they may require immediate medical attention, offer to create an escalation/support request (e.g. {escalation_consent_example}), and if they consent, call `create_escalation`.\n"
        f"MEMORY:\n"
        f"{memory_instruction}"
        f"HEALTHCARE FACILITY LOOKUP:\n"
        f"- You can search for nearby hospitals, clinics, and doctors using the `lookup_healthcare_facilities` tool.\n"
        f"- Check conversation history for a general location (city/district/area like 'Jaipur' or 'Dehradun') and use it. If not present in history, verbally prompt the user (e.g., {no_location_prompt}).\n"
        f"- If the target location is ambiguous or phonetically garbled, ask for confirmation (e.g., {lookup_unclear_prompt}).\n"
        f"- Treat `session_language` in the tool response as authoritative for the response language.\n"
        f"- Summarize only top 2 to 3 facilities. Mention OSM contributors. Tell user to verify details. Do NOT claim data is government-certified.\n"
        f"- If the lookup fails, state: {failure_prompt}.\n"
        f"{sip_instruction}"
        f"Style: Max 2-3 short sentences. NEVER use markdown (no * or **, lists, or bullet points). Use simple conversational language.\n"
    )
    return prompt


def update_specialist_prompt(specialist, lang: str) -> None:
    is_guest = getattr(specialist, "is_guest", False)
    is_sip = getattr(specialist, "is_sip", False)
    new_prompt = get_specialist_system_prompt(lang, is_guest=is_guest, is_sip=is_sip)
    specialist._instructions = new_prompt
    if hasattr(specialist, "_chat_ctx") and specialist._chat_ctx is not None:
        for item in specialist._chat_ctx._items:
            if hasattr(item, "role") and item.role == "system":
                item.content = new_prompt


def detect_explicit_language_switch(text: str) -> str | None:
    t = text.lower().strip()
    switch_indicators = [
        "switch to", "speak", "talk", "baat kar", "bol", "madhe", "me bol",
        "translate to", "change language", "language to"
    ]
    
    # We map language names to their standard representation
    lang_keywords = {
        "hindi": ["hindi", "हिन्दी", "हैंडी"],
        "marathi": ["marathi", "मराठी"],
        "tamil": ["tamil", "தமிழ்", "तमিল"],
        "telugu": ["telugu", "తెలుగు", "तेलुगु"],
        "kannada": ["kannada", "ಕನ್ನಡ", "कन्नड़"],
        "gujarati": ["gujarati", "ગુજરાતી", "गुजराती"],
        "punjabi": ["punjabi", "ਪੰਜਾਬੀ", "पंजाबी"],
        "bengali": ["bengali", "bangla", "বাংলা", "बंगाली"],
        "malayalam": ["malayalam", "മലയാളം", "मलयालम"],
        "spanish": ["spanish", "español", "स्पैनिश"],
        "french": ["french", "français", "फ्रेंच"],
        "german": ["german", "deutsch", "जर्मन"],
        "italian": ["italian", "italiano", "इতালਵੀ"],
        "portuguese": ["portuguese", "português", "पुर्तगाली"],
        "japanese": ["japanese", "日本語", "जापानी"],
        "english": ["english", "अंग्रेजी"],
    }
    
    for lang, keywords in lang_keywords.items():
        for kw in keywords:
            if kw in t:
                if lang == "english" and "hinglish" in t:
                    return "Hinglish"
                return lang.capitalize()
                
    return None


def detect_language(text: str, current_lang: str = "Hinglish") -> str:
    if not text:
        return current_lang

    # Check for explicit switch
    explicit_lang = detect_explicit_language_switch(text)
    if explicit_lang:
        return explicit_lang

    t = text.lower().strip()

    # Unicode script checks for Indian languages
    if any(0x0B80 <= ord(c) <= 0x0BFF for c in text):
        return "Tamil"
    if any(0x0C00 <= ord(c) <= 0x0C7F for c in text):
        return "Telugu"
    if any(0x0C80 <= ord(c) <= 0x0CFF for c in text):
        return "Kannada"
    if any(0x0D00 <= ord(c) <= 0x0D7F for c in text):
        return "Malayalam"
    if any(0x0980 <= ord(c) <= 0x09FF for c in text):
        return "Bengali"
    if any(0x0A80 <= ord(c) <= 0x0AFF for c in text):
        return "Gujarati"
    if any(0x0A00 <= ord(c) <= 0x0A7F for c in text):
        return "Punjabi"
    if any(0x3040 <= ord(c) <= 0x30FF or 0x4E00 <= ord(c) <= 0x9FFF for c in text):
        return "Japanese"

    # Devanagari script (Hindi or Marathi)
    if any(0x0900 <= ord(c) <= 0x097F for c in text):
        marathi_markers = ["आहे", "आहेत", "नाही", "काय", "मला", "तुम्ही", "आपल्या", "करतो", "केला", "पण", "झाला", "होते"]
        if any(marker in t for marker in marathi_markers):
            return "Marathi"
        return "Hindi"

    # Latin script vocabulary matches
    spanish_words = {"hola", "gracias", "buenos", "dias", "tarde", "noche", "por", "favor", "salud", "medico", "dolor", "cabeza"}
    french_words = {"bonjour", "merci", "sante", "medecin", "mal", "tete", "oui", "s'il", "vous", "plait"}
    german_words = {"hallo", "danke", "gesundheit", "arzt", "schmerz", "kopf", "ja", "bitte"}
    italian_words = {"ciao", "grazie", "salute", "medico", "dolore", "testa", "si", "per", "favore"}
    portuguese_words = {"ola", "obrigado", "obrigada", "saude", "medico", "dor", "cabeca", "sim", "por"}
    japanese_romaji = {"konnichiwa", "arigatou", "isha", "itai", "atama", "hai", "onegaishimasu"}

    words = set(t.split())
    if words & spanish_words:
        return "Spanish"
    if words & french_words:
        return "French"
    if words & german_words:
        return "German"
    if words & italian_words:
        return "Italian"
    if words & portuguese_words:
        return "Portuguese"
    if words & japanese_romaji:
        return "Japanese"

    # Common Hindi/Hinglish vocabulary
    hindi_hinglish_words = {
        "hai", "hain", "hoon", "aap", "tum", "mera", "meri", "mujhe", "kya", "haan",
        "na", "nahi", "nhi", "ji", "karo", "kaise", "thik", "theek", "se", "ko",
        "par", "ek", "aur", "ya", "bhi", "yeh", "woh", "sath", "swasthya", "dard",
        "bukhar", "sir", "sar", "pet", "bimari", "doctor", "dawa", "namaste",
        "namaskar", "pranam"
    }
    hindi_word_count = sum(1 for w in words if w in hindi_hinglish_words)

    # Marathi in Latin script
    marathi_latin_words = {"aahe", "aahet", "nahi", "nahiye", "kay", "mala", "tula", "tumhi", "karto", "kela", "pan", "jhala"}
    marathi_word_count = sum(1 for w in words if w in marathi_latin_words)

    if marathi_word_count > 0 and marathi_word_count >= hindi_word_count:
        return "Marathi"

    if hindi_word_count > 0:
        non_hindi_words = sum(1 for w in words if w not in hindi_hinglish_words)
        if non_hindi_words > 0:
            return "Hinglish"
        return "Hindi"

    return "English"


# Localized silence prompts
SILENCE_PROMPTS = {
    "English": {
        "prompt1": "I'm still here. Whenever you're ready, you can ask your question.",
        "goodbye": "It looks like there are no more questions for now. I'm here whenever you need me. Take care.",
    },
    "Hindi": {
        "prompt1": "मैं यहीं हूँ। जब आप तैयार हों, अपना सवाल पूछ सकते हैं।",
        "goodbye": "लगता है अभी कोई और सवाल नहीं है। जब भी ज़रूरत हो, मैं यहीं हूँ। अपना ख्याल रखिए।",
    },
    "Hinglish": {
        "prompt1": "Main yahin hoon. Jab aap ready hon, apna question pooch sakte hain.",
        "goodbye": "Lagta hai filhaal koi aur question nahi hai. Jab bhi zarurat ho, main yahin hoon. Apna khayal rakhiye.",
    },
    "Marathi": {
        "prompt1": "मी इथेच आहे. जेव्हा तुम्ही तयार असाल, तेव्हा तुमचा प्रश्न विचारू शकता.",
        "goodbye": "सध्या आणखी काही प्रश्न दिसत नाहीत. तुम्हाला गरज असेल तेव्हा मी इथेच आहे. स्वतःची काळजी घ्या.",
    },
    "Gujarati": {
        "prompt1": "હું અહીં જ છું. જ્યારે તમે તૈયાર હોવ, ત્યારે તમે તમારો પ્રશ્ન પૂછી શકો છો.",
        "goodbye": "લાગે છે કે અત્યારે કોઈ પ્રશ્નો નથી. જ્યારે પણ જરૂર હોય, હું અહીં જ છું. ਆਪਣა ਖਿਆલ ਰੱਖો.",
    },
    "Tamil": {
        "prompt1": "நான் இங்கேயே இருக்கிறேன். நீங்கள் தயாராக இருக்கும்போது உங்கள் கேள்வியைக் கேட்கலாம்.",
        "goodbye": "தற்போது வேறு கேள்விகள் இல்லை என்று நினைக்கிறேன். உங்களுக்குத் தேவைப்படும்போது நான் இங்கேயே இருக்கிறேன். உடலைக் கவனித்துக் கொள்ளுங்கள்.",
    },
    "Telugu": {
        "prompt1": "నేను ఇక్కడే ఉన్నాను. మీరు సిద్ధంగా ఉన్నప్పుడు మీ ప్రశ్న అడగవచ్చు.",
        "goodbye": "ప్రస్తుతానికి ఇతర ప్రశ్నలు ఏవీ లేవనిపిస్తోంది. మీకు అవసరమైనప్పుడు నేను ఇక్కడే ఉంటాను. జాగ్రత్తగా ఉండండి.",
    },
    "Kannada": {
        "prompt1": "ನಾನು ಇಲ್ಲೇ ಇದ್ದೇನೆ. ನೀವು ಸಿದ್ಧರಾದಾಗ ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಕೇಳಬಹುದು.",
        "goodbye": "আপাতত আর কোনো প্রশ্ন নেই মনে হচ্ছে। আপনার প্রয়োজন হলে আমি এখানেই আছি। নিজের যত্ন নিন.",
    },
    "Bengali": {
        "prompt1": "আমি এখানেই আছি। আপনি যখন প্রস্তুত হবেন, আপনার প্রশ্ন জিজ্ঞাসা করতে পারেন।",
        "goodbye": "আপাতত আর কোনো প্রশ্ন নেই মনে হচ্ছে। আপনার প্রয়োজন হলে আমি এখানেই আছি। নিজের যত্ন নেবেন।",
    },
    "Malayalam": {
        "prompt1": "ഞാൻ ഇവിടെത്തന്നെയുണ്ട്. നിങ്ങൾ തയ്യാറാകുമ്പോൾ ചോദ്യം ചോദിക്കാം.",
        "goodbye": "ഇപ്പോഴത്തേക്ക് മറ്റ് ചോദ്യങ്ങളൊന്നുമില്ലെന്ന് തോന്നുന്നു. നിങ്ങൾക്ക് ആവശ്യമുള്ളപ്പോഴെല്ലാം ഞാൻ ഇവിടെയുണ്ടാകും. സൂക്ഷിക്കുക.",
    },
    "Punjabi": {
        "prompt1": "ਮੈਂ ਇੱਥੇ ਹੀ ਹਾਂ। ਜਦੋਂ ਵੀ ਤੁਸੀਂ ਤਿਆਰ ਹੋਵੋ, ਆਪਣਾ ਸਵਾਲ ਪੁੱਛ ਸਕਦੇ ਹੋ।",
        "goodbye": "ਲੱਗਦਾ ਹੈ ਅਜੇ ਕੋਈ ਹੋਰ ਸਵਾਲ ਨਹੀਂ ਹੈ। ਜਦੋਂ ਵੀ ਲੋੜ ਹੋਵੇ, ਮੈਂ ਇੱਥе ਹੀ ਹਾਂ। ਆਪਣਾ ਖਿਆਲ ਰੱਖਣਾ।",
    },
    "Spanish": {
        "prompt1": "Sigo aquí. Cuando esté listo, puede hacer su pregunta.",
        "goodbye": "Parece que no hay más preguntas por ahora. Estarei aquí cuando me necesite. Cuídese.",
    },
    "French": {
        "prompt1": "Je suis toujours là. Quand vous êtes prêt, vous pouvez poser votre question.",
        "goodbye": "Il semble qu'il n'y ait plus de questions pour le moment. Je suis là quand vous avez besoin de moi. Prenez soin de vous.",
    },
    "German": {
        "prompt1": "Ich bin immer noch hier. Wenn Sie bereit sind, können Sie Ihre Frage stellen.",
        "goodbye": "Es scheint vorerst keine Fragen mehr zu geben. Ich bin da, wenn Sie mich brauchen. Passen Sie auf sich auf.",
    },
    "Italian": {
        "prompt1": "Sono ancora qui. Quando sei pronto, puoi fare la tua domanda.",
        "goodbye": "Sembra che non ci siano altre domande per ora. Sono qui quando hai bisogno di me. Abbi cura di te.",
    },
    "Portuguese": {
        "prompt1": "Ainda estou aqui. Quando estiver pronto, pode fazer sua pergunta.",
        "goodbye": "Parece que não há mais perguntas por enquanto. Estarei aqui quando precisar. Cuide-se.",
    },
    "Japanese": {
        "prompt1": "私はここにいます。ご準備ができたら、質問してください。",
        "goodbye": "今のところ質問は他にないようです。必要な時はいつでもここにいます。お体に気をつけて。"
    }
}

GREETINGS = [
    "Namaste! Main Aarogyam hoon, aapka AI Health Assistant. Main general health guidance, healthy lifestyle tips aur common health-related questions mein aapki madad kar sakta hoon. Main doctor nahi hoon aur diagnosis ya prescription provide nahi karta. Batayiye, aaj main aapki kis tarah madad kar sakta hoon?",
    "Namaste! Aarogyam AI Health Companion mein aapka swagat hai. Main aapko health and wellness tips, healthy habits aur general medical queries par guidance de sakta hoon. Main koi professional doctor nahi hoon, isliye diagnosis ya medication nahi de sakta. Aaj main aapki kya madad karoon?",
    "Namaste! Main Aarogyam AI Assistant bol raha hoon. Yahan main aapki wellness, nutrition aur daily health habits se jude sawaalon mein madad karne ke liye hoon. Main professional medical advice ya prescription nahi deta hoon. Batayiye, aaj aap apne swasthya ke baare mein kya poochna chahenge?",
]

OUTBOUND_GREETINGS = {
    "English": (
        "Hello, this is Aarogyam, your AI Health Companion. I am calling to remind you "
        "about your scheduled health follow-up and step goals today. If you wish to stop "
        "receiving these reminders, you can say 'stop calling' at any time. How are you feeling today?"
    ),
    "Hinglish": (
        "Namaste, main Aarogyam bol raha hoon, aapka AI Health Companion. Main aapko aapke "
        "health follow-up aur daily step goals ke baare mein remind karne ke liye call kar raha hoon. "
        "Agar aap ye calls band karna chahte hain, toh aap kisi bhi waqt 'stop calling' keh sakte hain. "
        "Aaj aap kaisa feel kar rahe hain?"
    ),
    "Hindi": (
        "नमस्ते, मैं आरोग्यम हूँ, आपकी एआई हेल्थ साथी। मैं आपको आपके स्वास्थ्य फॉलो-अप और "
        "दैनिक स्टेप गोल्स के बारे में याद दिलाने के लिए कॉल कर रही हूँ। अगर आप ये कॉल्स "
        "बंद करना चाहते हैं, तो आप किसी भी समय 'कॉल बंद करें' कह सकते हैं। आज आप कैसा महसूस कर रहे हैं?"
    ),
}


def _haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points in kilometers."""
    R = 6371.0  # Earth's radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def _geocode_location(location: str) -> tuple[float, float, str] | None:
    """Geocode a location in India using OSM Nominatim API.
    Returns (lat, lon, display_name) or None.
    """
    params = {"q": location, "format": "json", "limit": 1, "countrycodes": "in"}
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(params)

    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "AarogyamHealthAccessAgent/1.0 (contact: support@aarogyam.ai)"
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            if response.status != 200:
                logger.error(f"Nominatim API returned HTTP {response.status}")
                return None
            data = json.loads(response.read().decode("utf-8"))
            if not data:
                logger.warning(
                    f"Nominatim returned empty results for location: {location}"
                )
                return None

            first = data[0]
            lat = float(first["lat"])
            lon = float(first["lon"])
            display_name = first.get("display_name", location)
            return lat, lon, display_name
    except Exception as e:
        logger.error(f"Failed to geocode location '{location}': {e}")
        return None


def _fetch_nearby_facilities(lat: float, lon: float) -> list[dict]:
    """Fetch hospitals, clinics, and doctors within 5km of (lat, lon) using Overpass API.
    Returns sorted list by distance.
    """
    query = f"""[out:json][timeout:15];
(
  nwr["amenity"="hospital"](around:5000,{lat},{lon});
  nwr["amenity"="clinic"](around:5000,{lat},{lon});
  nwr["amenity"="doctors"](around:5000,{lat},{lon});
);
out body;"""

    url = "https://overpass-api.de/api/interpreter"
    req_data = urllib.parse.urlencode({"data": query}).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=req_data,
        headers={
            "User-Agent": "AarogyamHealthAccessAgent/1.0 (contact: support@aarogyam.ai)",
            "Content-Type": "application/x-www-form-urlencoded",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            if response.status != 200:
                logger.error(f"Overpass API returned HTTP {response.status}")
                return []

            data = json.loads(response.read().decode("utf-8"))
            elements = data.get("elements", [])
            facilities = []

            for elem in elements:
                tags = elem.get("tags", {})
                name = tags.get("name")
                if not name:
                    continue

                elem_lat = elem.get("lat")
                elem_lon = elem.get("lon")

                if elem_lat is None or elem_lon is None:
                    center = elem.get("center", {})
                    elem_lat = center.get("lat")
                    elem_lon = center.get("lon")

                if elem_lat is None or elem_lon is None:
                    continue

                dist = _haversine_distance(lat, lon, elem_lat, elem_lon)

                addr_parts = []
                for tag_name in [
                    "addr:street",
                    "addr:suburb",
                    "addr:city",
                    "addr:postcode",
                ]:
                    val = tags.get(tag_name)
                    if val:
                        addr_parts.append(val)
                address = (
                    ", ".join(addr_parts)
                    if addr_parts
                    else "Location details not available"
                )

                facilities.append(
                    {
                        "name": name,
                        "type": tags.get("amenity", "healthcare_facility")
                        .replace("_", " ")
                        .title(),
                        "address": address,
                        "distance_km": round(dist, 2),
                        "lat": elem_lat,
                        "lon": elem_lon,
                    }
                )

            facilities.sort(key=lambda x: x["distance_km"])
            return facilities
    except Exception as e:
        logger.error(f"Failed to fetch nearby facilities from Overpass: {e}")
        return []


class Assistant(Agent):
    def __init__(
        self,
        user_id: str = "guest_session",
        user_name: str = "Guest",
        is_guest: bool = True,
        is_sip: bool = False,
    ) -> None:
        self.user_id = user_id
        self.user_name = user_name
        self.is_guest = is_guest
        self.is_sip = is_sip
        self.current_lang = "Hinglish"
        self.call_tracker = {
            "started_at": datetime.now(timezone.utc),
            "user_speech_count": 0,
            "agent_response_count": 0,
            "escalation_status": None,
            "lookup_status": None,
            "opt_out_status": None,
            "has_error": False,
            "is_saved": False,
        }
        super().__init__(
            instructions=get_system_prompt("Hinglish", is_guest=is_guest, is_sip=is_sip)
        )

    async def on_enter(self) -> None:
        logger.info("Assistant entered.")
        try:
            # Set participant attributes for UI state change
            await self._activity.session.room_io.room.local_participant.set_attributes({
                "agent_role": "main_agent"
            })
        except Exception as e:
            logger.warning(f"Failed to set attributes: {e}")

    @function_tool
    async def handoff_to_clinic_specialist(self, context: RunContext) -> str:
        """Call this tool to hand off the conversation to the Clinic & Appointment Specialist.
        Use this tool when the user wants to:
        - Find a clinic or hospital.
        - Locate nearby healthcare facilities.
        - Ask for facility details (e.g. primary health centres).
        - Ask appointment-related questions.
        - Help choosing between healthcare facilities.
        
        Do NOT use this tool for:
        - General wellness questions, diet, or exercise.
        - General health education or normal symptom questions.
        - Memory-related requests or human escalation requests.
        - Emergency situations (which require safety/escalation flow).
        """
        logger.info("Assistant handing off to Clinic & Appointment Specialist...")
        announcement = "I'll connect you with our clinic and appointment specialist so they can help you with that."
        if self.current_lang == "Hindi":
            announcement = "मैं आपको हमारे क्लिनिक और अपॉइंटमेंट विशेषज्ञ से जोड़ती हूँ ताकि वे आपकी मदद कर सकें।"
        elif self.current_lang == "Hinglish":
            announcement = "Main aapko hamare clinic aur appointment specialist se connect kar deti hoon taaki wo aapki help kar sakein."

        try:
            await context.session.room_io.room.local_participant.set_attributes({
                "agent_role": "clinic_specialist_connecting"
            })
        except Exception as e:
            logger.warning(f"Failed to set attributes: {e}")

        # Speak announcement first
        speech_handle = context.session.say(announcement, allow_interruptions=False)
        await speech_handle

        # Instantiate specialist agent
        specialist = ClinicAppointmentSpecialist(
            chat_ctx=self._chat_ctx,
            user_id=self.user_id,
            user_name=self.user_name,
            is_guest=self.is_guest,
            is_sip=self.is_sip,
            call_tracker=self.call_tracker,
        )
        specialist.current_lang = self.current_lang
        update_specialist_prompt(specialist, self.current_lang)

        return specialist, "Handoff to Clinic & Appointment Specialist completed."

    @function_tool
    async def lookup_caller(self, context: RunContext) -> str:
        """Use this tool at the beginning of the conversation to check if the user is a returning caller
        and retrieve their name, language preference, and any previously saved facts/context.
        """
        logger.info(f"Looking up caller details for user_id: {self.user_id}")
        try:
            record = MemoryService.get_caller(self.user_id)
            if record:
                return (
                    f"Caller Record Found:\n"
                    f"Name: {record.name}\n"
                    f"Language Preference: {record.language_preference}\n"
                    f"Wellness Facts: {', '.join(record.facts)}\n"
                    f"Last Interaction: {record.last_interaction}"
                )
            else:
                return f"No previous record found for caller. Name: {self.user_name}."
        except Exception as e:
            logger.error(f"Error looking up caller: {e}")
            return "Error retrieving caller history."

    @function_tool
    async def save_caller_info(
        self,
        context: RunContext,
        name: str,
        language_preference: str,
        facts: list[str],
        consent_granted: bool,
    ) -> str:
        """CRITICAL: You are FORBIDDEN from invoking this tool during the same turn in which information is first shared.
        You must first verbally ask the user for permission, wait for their next turn response, and only call this tool if they explicitly give positive consent.
        Negative, ambiguous, or absent consent means you must NOT save.

        Args:
            name: The caller's name.
            language_preference: The caller's preferred language.
            facts: 2 to 4 wellness-related facts (e.g. step goals, sleep habits, activity level, vegetarian preference). Do NOT store sensitive medical notes, clinical details, or prescriptions.
            consent_granted: Must be True. If the caller said no, do NOT call this tool.
        """
        logger.info(
            f"Attempting to save caller info for user_id: {self.user_id}. Consent: {consent_granted}"
        )
        if self.is_guest:
            return "Error: Guest sessions cannot persist memory. Please log in to save caller information."

        if not consent_granted:
            return "Error: Consent not granted. Caller information was NOT saved."

        if not (2 <= len(facts) <= 4):
            return "Error: You must provide between 2 and 4 wellness-related facts."

        try:
            MemoryService.save_caller(
                user_id=self.user_id,
                name=name,
                language_preference=language_preference,
                facts=facts,
            )
            return "Success: Caller information saved successfully."
        except Exception as e:
            logger.error(f"Error saving caller info: {e}")
            return "Error: Failed to save caller information."

    @function_tool
    async def opt_out_telephony(self, context: RunContext) -> str:
        """Use this tool when the user requests to opt-out or stop receiving future calls/reminders.
        This will record their preference in their caller memory record.
        """
        logger.info(f"User {self.user_id} requested opt-out of telephony reminders.")
        self.call_tracker["opt_out_status"] = "requested"
        if self.is_guest:
            self.call_tracker["opt_out_status"] = "failed"
            return "Error: Guest sessions cannot persist opt-out preferences."

        try:
            record = MemoryService.get_caller(self.user_id)
            name = record.name if record else self.user_name
            language_preference = (
                record.language_preference if record else self.current_lang
            )
            facts = record.facts if record else []

            # Clean existing call-related facts and add opt-out flag
            facts = [f for f in facts if "calls" not in f and "opted" not in f] + [
                "opted_out_of_calls"
            ]

            MemoryService.save_caller(
                user_id=self.user_id,
                name=name,
                language_preference=language_preference,
                facts=facts,
            )
            self.call_tracker["opt_out_status"] = "success"
            return "Success: User has been opted out of future health reminders."
        except Exception as e:
            logger.error(f"Error saving opt-out preference: {e}")
            self.call_tracker["opt_out_status"] = "failed"
            self.call_tracker["has_error"] = True
            return "Error: Failed to register opt-out preference."

    async def lookup_healthcare_facilities(
        self,
        context: RunContext,
        location: str,
    ) -> str:
        """Look up nearby healthcare facilities (hospitals, clinics, and doctors) for a specified Indian location.

        Use this tool when:
        - The user asks for nearby hospitals, clinics, doctors, primary health centres (PHCs), or health centres.
        - A specific Indian location (city, area, or district) is provided by the user or is available in caller history.

        Do NOT use this tool:
        - For medical diagnosis, prescribing medications, or giving treatment advice.
        - When the user has not provided a specific location name and none exists in memory (ask for the location verbally instead).
        - To fabricate or guess healthcare facility availability.

        Args:
            location: The name of the city, district, neighborhood, or area in India to search in.
        """
        logger.info(f"Looking up healthcare facilities for location: {location}")
        self.call_tracker["lookup_status"] = "requested"
        fetched_at = datetime.now(timezone.utc).isoformat()
        session_lang = getattr(self, "current_lang", "Hinglish")

        # 1. Geocode the location
        geocoded = await asyncio.to_thread(_geocode_location, location)
        if not geocoded:
            self.call_tracker["lookup_status"] = "failed"
            result = {
                "status": "failed",
                "reason": f"Could not geocode or locate '{location}' in India.",
                "fetched_at": fetched_at,
                "session_language": session_lang,
                "source": "OpenStreetMap contributors",
            }
            return json.dumps(result, ensure_ascii=False)

        lat, lon, display_name = geocoded
        logger.info(f"Resolved '{location}' to ({lat}, {lon}) - '{display_name}'")

        # 2. Fetch nearby facilities (hospital, clinic, doctors) within 5km radius
        facilities = await asyncio.to_thread(_fetch_nearby_facilities, lat, lon)

        # Limit to top 2-3 facilities
        top_facilities = facilities[:3]

        # If no facilities found
        if not top_facilities:
            self.call_tracker["lookup_status"] = "success"
            result = {
                "status": "failed",
                "reason": f"No healthcare facilities found within 5km of '{display_name}'.",
                "fetched_at": fetched_at,
                "session_language": session_lang,
                "source": "OpenStreetMap contributors",
            }
            return json.dumps(result, ensure_ascii=False)

        # Return success with facilities
        self.call_tracker["lookup_status"] = "success"
        result = {
            "status": "success",
            "location": display_name,
            "coordinates": {"lat": lat, "lon": lon},
            "facilities": top_facilities,
            "fetched_at": fetched_at,
            "session_language": session_lang,
            "source": "OpenStreetMap contributors",
        }
        return json.dumps(result, ensure_ascii=False)

    @function_tool
    async def create_escalation(
        self,
        context: RunContext,
        problem_summary: str,
        checks_performed: str,
        urgency: str,
        preferred_follow_up: str,
    ) -> str:
        """Create a human healthcare support request.
        CRITICAL: You are FORBIDDEN from invoking this tool before telling the user what details will be shared
        and receiving explicit positive consent. If consent is not explicitly granted, do NOT call this tool.

        Args:
            problem_summary: A concise summary of the caller's problem/symptoms. Do NOT include sensitive info like passwords, OTPs, PINs, or account numbers.
            checks_performed: What Aarogyam checked, advised, or determined so far.
            urgency: The urgency level of the request. Must be one of: 'low', 'medium', 'high', 'emergency'.
            preferred_follow_up: The user's preferred follow-up method (e.g. 'phone call', 'SMS').
        """
        logger.info(
            f"Creating escalation for user_id: {self.user_id}. Urgency: {urgency}"
        )
        self.call_tracker["escalation_status"] = "requested"
        if urgency not in ("low", "medium", "high", "emergency"):
            self.call_tracker["escalation_status"] = "failed"
            return "Error: Urgency must be one of: 'low', 'medium', 'high', 'emergency'."

        try:
            escalation = Escalation(
                user_id=self.user_id,
                problem_summary=problem_summary,
                checks_performed=checks_performed,
                urgency=urgency,
                language=self.current_lang,
                preferred_follow_up=preferred_follow_up,
            )
            EscalationService.create_escalation_record(escalation)
            logger.info(f"Escalation successfully created with reference ID: {escalation.id}")
            self.call_tracker["escalation_status"] = "created"
            return f"Success: Request created successfully. Reference ID: {escalation.id}. Status: {escalation.status}."
        except Exception as e:
            logger.error(f"Error creating escalation record: {e}")
            self.call_tracker["escalation_status"] = "failed"
            self.call_tracker["has_error"] = True
            return "Error: Failed to create escalation request."


class ClinicAppointmentSpecialist(Agent):
    def __init__(
        self,
        chat_ctx: llm.ChatContext,
        user_id: str = "guest_session",
        user_name: str = "Guest",
        is_guest: bool = True,
        is_sip: bool = False,
        call_tracker: dict = None,
    ) -> None:
        self.user_id = user_id
        self.user_name = user_name
        self.is_guest = is_guest
        self.is_sip = is_sip
        self.current_lang = "Hinglish"
        self.call_tracker = call_tracker if call_tracker is not None else {}
        super().__init__(
            instructions=get_specialist_system_prompt("Hinglish", is_guest=is_guest, is_sip=is_sip),
            chat_ctx=chat_ctx,
        )

    async def on_enter(self) -> None:
        logger.info("ClinicAppointmentSpecialist entered.")
        try:
            # Set participant attributes for UI state change
            await self._activity.session.room_io.room.local_participant.set_attributes({
                "agent_role": "clinic_specialist"
            })
        except Exception as e:
            logger.warning(f"Failed to set attributes: {e}")

        # Proactively respond after handoff
        self._activity.session.generate_reply()

    @function_tool
    async def handoff_to_main_agent(self, context: RunContext) -> str:
        """Call this tool to return the conversation back to the main Aarogyam agent.
        Use this tool ONLY when:
        - The user changes the topic completely to general health, wellness, diet, exercise, or general symptoms.
        
        Do NOT use this tool:
        - If the user asks about clinic/hospital details, locations, opening hours, appointments, or ratings/reviews of clinics. If you don't know the rating or review, state that you don't have that info, but do NOT hand back.
        """
        logger.info("Specialist handing back to main Aarogyam agent...")
        announcement = "I've helped you with the clinic information. I'll hand you back to Aarogyam for anything else."
        if self.current_lang == "Hindi":
            announcement = "मैंने आपको क्लिनिक की जानकारी दे दी है। अब मैं आपको बाकी चीज़ों के लिए वापस आरोग्यम से जोड़ती हूँ।"
        elif self.current_lang == "Hinglish":
            announcement = "Maine aapko clinic ki information de di hai. Ab main aapko baki cheezon ke liye wapas Aarogyam se connect kar deti hoon."

        try:
            await context.session.room_io.room.local_participant.set_attributes({
                "agent_role": "main_agent_connecting"
            })
        except Exception as e:
            logger.warning(f"Failed to set attributes: {e}")

        # Speak announcement first
        speech_handle = context.session.say(announcement, allow_interruptions=False)
        await speech_handle

        # Instantiate main agent
        main_agent = Assistant(
            user_id=self.user_id,
            user_name=self.user_name,
            is_guest=self.is_guest,
            is_sip=self.is_sip,
        )
        main_agent.current_lang = self.current_lang
        # Copy the analytics call tracker back
        main_agent.call_tracker = self.call_tracker
        update_assistant_prompt(main_agent, self.current_lang)

        return main_agent, "Handoff back to main Aarogyam agent completed."

    @function_tool
    async def lookup_healthcare_facilities(
        self,
        context: RunContext,
        location: str,
    ) -> str:
        """Look up nearby healthcare facilities (hospitals, clinics, and doctors) for a specified Indian location.

        Use this tool when:
        - The user asks for nearby hospitals, clinics, doctors, primary health centres (PHCs), or health centres.
        - A specific Indian location (city, area, or district) is provided by the user or is available in caller history.

        Do NOT use this tool:
        - For medical diagnosis, prescribing medications, or giving treatment advice.
        - When the user has not provided a specific location name and none exists in memory (ask for the location verbally instead).
        - To fabricate or guess healthcare facility availability.

        Args:
            location: The name of the city, district, neighborhood, or area in India to search in.
        """
        logger.info(f"Specialist looking up healthcare facilities for location: {location}")
        fetched_at = datetime.now(timezone.utc).isoformat()
        session_lang = getattr(self, "current_lang", "Hinglish")
        self.call_tracker["lookup_status"] = "requested"

        # 1. Geocode the location
        geocoded = await asyncio.to_thread(_geocode_location, location)
        if not geocoded:
            self.call_tracker["lookup_status"] = "failed"
            result = {
                "status": "failed",
                "reason": f"Could not geocode or locate '{location}' in India.",
                "fetched_at": fetched_at,
                "session_language": session_lang,
                "source": "OpenStreetMap contributors",
            }
            return json.dumps(result, ensure_ascii=False)

        lat, lon, display_name = geocoded
        logger.info(f"Resolved '{location}' to ({lat}, {lon}) - '{display_name}'")

        # 2. Fetch nearby facilities (hospital, clinic, doctors) within 5km radius
        facilities = await asyncio.to_thread(_fetch_nearby_facilities, lat, lon)

        # Limit to top 2-3 facilities
        top_facilities = facilities[:3]

        # If no facilities found
        if not top_facilities:
            self.call_tracker["lookup_status"] = "success"
            result = {
                "status": "failed",
                "reason": f"No healthcare facilities found within 5km of '{display_name}'.",
                "fetched_at": fetched_at,
                "session_language": session_lang,
                "source": "OpenStreetMap contributors",
            }
            return json.dumps(result, ensure_ascii=False)

        # Return success with facilities
        self.call_tracker["lookup_status"] = "success"
        result = {
            "status": "success",
            "location": display_name,
            "coordinates": {"lat": lat, "lon": lon},
            "facilities": top_facilities,
            "fetched_at": fetched_at,
            "session_language": session_lang,
            "source": "OpenStreetMap contributors",
        }
        return json.dumps(result, ensure_ascii=False)

    @function_tool
    async def create_escalation(
        self,
        context: RunContext,
        problem_summary: str,
        checks_performed: str,
        urgency: str,
        preferred_follow_up: str,
    ) -> str:
        """Create a human healthcare support request.
        CRITICAL: You are FORBIDDEN from invoking this tool before telling the user what details will be shared
        and receiving explicit positive consent. If consent is not explicitly granted, do NOT call this tool.

        Args:
            problem_summary: A concise summary of the caller's problem/symptoms. Do NOT include sensitive info like passwords, OTPs, PINs, or account numbers.
            checks_performed: What Aarogyam checked, advised, or determined so far.
            urgency: The urgency level of the request. Must be one of: 'low', 'medium', 'high', 'emergency'.
            preferred_follow_up: The user's preferred follow-up method (e.g. 'phone call', 'SMS').
        """
        logger.info(
            f"Specialist creating escalation for user_id: {self.user_id}. Urgency: {urgency}"
        )
        self.call_tracker["escalation_status"] = "requested"
        if urgency not in ("low", "medium", "high", "emergency"):
            self.call_tracker["escalation_status"] = "failed"
            return "Error: Urgency must be one of: 'low', 'medium', 'high', 'emergency'."

        try:
            escalation = Escalation(
                user_id=self.user_id,
                problem_summary=problem_summary,
                checks_performed=checks_performed,
                urgency=urgency,
                language=self.current_lang,
                preferred_follow_up=preferred_follow_up,
            )
            EscalationService.create_escalation_record(escalation)
            logger.info(f"Escalation successfully created with reference ID: {escalation.id}")
            self.call_tracker["escalation_status"] = "created"
            return f"Success: Request created successfully. Reference ID: {escalation.id}. Status: {escalation.status}."
        except Exception as e:
            logger.error(f"Error creating escalation record: {e}")
            self.call_tracker["escalation_status"] = "failed"
            self.call_tracker["has_error"] = True
            return "Error: Failed to create escalation request."


server = AgentServer()


def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load(
        min_speech_duration=0.1,
        min_silence_duration=0.25,
        activation_threshold=0.5,
    )


server.setup_fnc = prewarm


@server.rtc_session(agent_name="my-agent")
async def my_agent(ctx: JobContext):
    # Logging setup
    # Add any other context you want in all log entries here
    ctx.log_context_fields = {
        "room": ctx.room.name,
    }

    # Prewarm TTS connection beforehand to reduce handshake latency
    tts_plugin = murf.TTS(
        voice="Anisha",
        style="Conversation",
        tokenizer=tokenize.blingfire.SentenceTokenizer(min_sentence_len=1),
        text_pacing=False,
        min_buffer_size=1,
    )
    try:
        tts_plugin.prewarm()
    except Exception as e:
        logger.warning(f"Error prewarming TTS: {e}")

    # Set up a voice AI pipeline using Murf Falcon, Gemini, Deepgram, and the LiveKit turn detector
    session = AgentSession(
        # Speech-to-text (STT) is your agent's ears, turning the user's speech into text that the LLM can understand
        # See all available models at https://docs.livekit.io/agents/models/stt/
        stt=deepgram.STT(
            model="nova-3",
            language="multi",
        ),
        # A Large Language Model (LLM) is your agent's brain, processing user input and generating a response
        # See all available models at https://docs.livekit.io/agents/models/llm/
        llm=google.LLM(
            model="gemini-3.5-flash-lite",
        ),
        # Text-to-speech (TTS) is your agent's voice, turning the LLM's text into speech that the user can hear
        # See all available models as well as voice selections at https://docs.livekit.io/agents/models/tts/
        tts=tts_plugin,
        # VAD and turn detection are used to determine when the user is speaking and when the agent should respond
        # See more at https://docs.livekit.io/agents/build/turns
        turn_detection=MultilingualModel(),
        vad=ctx.proc.userdata["vad"],
        # allow the LLM to generate a response while waiting for the end of turn
        # See more at https://docs.livekit.io/agents/build/audio/#preemptive-generation
        preemptive_generation=True,
        # Latency optimization settings:
        min_endpointing_delay=0.3,
        max_endpointing_delay=1.5,
        min_interruption_duration=0.3,
        aec_warmup_duration=0.1,
    )

    # To use a realtime model instead of a voice pipeline, use the following session setup instead.
    # (Note: This is for the OpenAI Realtime API. For other providers, see https://docs.livekit.io/agents/models/realtime/))
    # 1. Install livekit-agents[openai]
    # 2. Set OPENAI_API_KEY in .env.local
    # 3. Add `from livekit.plugins import openai` to the top of this file
    # 4. Use the following session setup instead of the version above
    # session = AgentSession(
    #     llm=openai.realtime.RealtimeModel(voice="marin")
    # )

    # # Add a virtual avatar to the session, if desired
    # # For other providers, see https://docs.livekit.io/agents/models/avatar/
    # avatar = hedra.AvatarSession(
    #   avatar_id="...",  # See https://docs.livekit.io/agents/models/avatar/plugins/hedra
    # )
    # # Start the avatar and wait for it to join
    # await avatar.start(session, room=ctx.room)

    # Wait for the remote participant list to synchronize asynchronously after connection
    await ctx.connect()

    user_participant = None
    for _ in range(30):  # Bounded polling loop: max 3 seconds, 0.1s intervals
        if ctx.room.remote_participants:
            user_participant = next(iter(ctx.room.remote_participants.values()), None)
            if user_participant:
                break
        await asyncio.sleep(0.1)

    is_sip = False
    if user_participant:
        user_id = user_participant.identity
        user_name = user_participant.name or "Guest"
        is_guest = False
        is_sip = user_participant.kind == rtc.ParticipantKind.PARTICIPANT_KIND_SIP
    else:
        # Safe non-persistent Guest path
        user_id = "guest_session"
        user_name = "Guest"
        is_guest = True

    assistant = Assistant(
        user_id=user_id, user_name=user_name, is_guest=is_guest, is_sip=is_sip
    )
    # Start the session, which initializes the voice pipeline and warms up the models
    await session.start(
        agent=assistant,
        room=ctx.room,
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=lambda params: (
                    noise_cancellation.BVCTelephony()
                    if params.participant.kind
                    == rtc.ParticipantKind.PARTICIPANT_KIND_SIP
                    else noise_cancellation.BVC()
                ),
            ),
        ),
    )

    # Wait briefly for audio pipeline to stabilize, then greet the user (stabilization sleep reduced to 0.1s)
    await asyncio.sleep(0.1)

    # Database lookup for personalized greeting and initial language preference
    greeting = None
    current_session_lang = "Hinglish"  # Default fallback
    if not is_guest:
        try:
            record = MemoryService.get_caller(user_id)
            if record:
                pref_lang = record.language_preference
                current_session_lang = pref_lang

                # Check for opt-out of telephony reminders
                if is_sip and "opted_out_of_calls" in record.facts:
                    opt_out_goodbye = (
                        "नमस्ते। आपने आरोग्यम कॉल्स से ऑप्ट-आउट किया हुआ है। "
                        "हम आपको दोबारा कॉल नहीं करेंगे। धन्यवाद।"
                        if pref_lang == "Hindi"
                        else "Welcome back. You have opted out of Aarogyam reminders. We will not call you again. Goodbye."
                    )
                    logger.info(
                        f"SIP caller {user_id} has opted out. Playing exit message and disconnecting."
                    )
                    speech_handle = session.say(
                        opt_out_goodbye, allow_interruptions=False
                    )
                    try:
                        await speech_handle
                    except Exception as e:
                        logger.warning(f"Error waiting for opt-out goodbye speech: {e}")
                    try:
                        await ctx.room.disconnect()
                    except Exception as e:
                        logger.warning(f"Error disconnecting room: {e}")
                    try:
                        session.shutdown()
                    except Exception as e:
                        logger.warning(f"Error shutting down session: {e}")
                    return

                if is_sip:
                    outbound_greeting = OUTBOUND_GREETINGS.get(
                        pref_lang, OUTBOUND_GREETINGS["Hinglish"]
                    )
                    if pref_lang == "Hindi":
                        greeting = f"नमस्ते {record.name}। {outbound_greeting}"
                    else:
                        greeting = f"Hello {record.name}. {outbound_greeting}"
                else:
                    if pref_lang == "English":
                        greeting = f"Welcome back, {record.name}. I remember your previous preferences. How can I help you today?"
                    elif pref_lang == "Hindi":
                        greeting = f"नमस्ते {record.name}। वापस स्वागत है। मुझे आपकी पिछली पसंद याद है। आज मैं आपकी कैसे मदद करूँ?"
                    else:  # Hinglish / fallback
                        greeting = f"Welcome back {record.name}! Mujhe aapki previous preferences yaad hain. Aaj main aapki kya help karoon?"
                logger.info(
                    f"Greeting returning caller {record.name} with language preference: {pref_lang}"
                )
        except Exception as e:
            logger.error(f"Error querying returning caller for greeting: {e}")

    if not greeting:
        if is_sip:
            greeting = OUTBOUND_GREETINGS.get(
                current_session_lang, OUTBOUND_GREETINGS["Hinglish"]
            )
            logger.info("Greeting new SIP caller with default outbound greeting.")
        else:
            greeting = random.choice(GREETINGS)
            logger.info("Greeting new caller with random default greeting.")

    assistant.current_lang = current_session_lang
    # Update assistant instructions synchronously first to avoid race conditions
    update_assistant_prompt(assistant, current_session_lang)
    # Also update asynchronously via the SDK method
    await assistant.update_instructions(
        get_system_prompt(current_session_lang, is_guest=is_guest, is_sip=is_sip)
    )
    greeting_handle = session.say(greeting, allow_interruptions=False)

    # Track if the greeting has completely finished playing
    greeting_finished = False

    # Track the last user speech text for language-aware silence prompting
    last_user_text = ""

    @session.on("user_input_transcribed")
    def on_user_input_transcribed(ev: UserInputTranscribedEvent):
        nonlocal last_user_text, current_session_lang
        if ev.is_final and ev.transcript:
            # Increment user speech count on the main assistant's tracker
            assistant.call_tracker["user_speech_count"] += 1
            text = ev.transcript
            last_user_text = text
            # Dynamically update session language if user explicitly switches language
            current_session_lang = detect_language(text, current_session_lang)
            
            active_agent = session.current_agent
            active_agent.current_lang = current_session_lang
            logger.info(
                f"User speech committed: '{text}'. Detected language: {current_session_lang}"
            )

            # Update TTS voice dynamically if supported
            voice_id = MURF_VOICE_MAPPING.get(current_session_lang)
            if voice_id:
                try:
                    session.tts.update_options(voice=voice_id)
                    logger.info(f"Updated TTS voice to: {voice_id} for language: {current_session_lang}")
                except Exception as e:
                    logger.warning(f"Failed to update TTS voice: {e}")

            # Update instructions on the active agent
            if isinstance(active_agent, Assistant):
                update_assistant_prompt(active_agent, current_session_lang)
                asyncio.create_task(
                    active_agent.update_instructions(
                        get_system_prompt(
                            current_session_lang,
                            is_guest=active_agent.is_guest,
                            is_sip=active_agent.is_sip
                        )
                    )
                )
            elif isinstance(active_agent, ClinicAppointmentSpecialist):
                update_specialist_prompt(active_agent, current_session_lang)
                asyncio.create_task(
                    active_agent.update_instructions(
                        get_specialist_system_prompt(
                            current_session_lang,
                            is_guest=active_agent.is_guest,
                            is_sip=active_agent.is_sip
                        )
                    )
                )

    silence_count = 0
    silence_timer_task = None

    async def run_silence_timer():
        nonlocal silence_count, silence_timer_task
        try:
            # Silence prompts respect the initialized persisted language preference
            # until the user explicitly speaks and triggers language switching detection
            lang = current_session_lang
            prompts = SILENCE_PROMPTS.get(lang, SILENCE_PROMPTS["Hinglish"])

            # 1st silence is 8 seconds
            if silence_count == 0:
                await asyncio.sleep(8.0)
                silence_count = 1
                logger.info(f"Silence detected. Language: {lang}. Prompting user.")
                session.say(prompts["prompt1"], allow_interruptions=True)
                start_silence_timer()
            elif silence_count == 1:
                # 2nd silence is 10 seconds
                await asyncio.sleep(10.0)
                silence_count = 2
                logger.info(
                    f"Silence detected twice. Language: {lang}. Saying goodbye and shutting down."
                )
                speech_handle = session.say(
                    prompts["goodbye"], allow_interruptions=False
                )
                try:
                    await speech_handle
                except Exception as e:
                    logger.warning(f"Error waiting for goodbye speech: {e}")

                try:
                    await ctx.room.disconnect()
                except Exception as e:
                    logger.warning(f"Error disconnecting room: {e}")

                try:
                    session.shutdown()
                except Exception as e:
                    logger.warning(f"Error shutting down session: {e}")
        except asyncio.CancelledError:
            pass

    def start_silence_timer():
        nonlocal silence_timer_task
        cancel_silence_timer()
        # Start silence monitoring ONLY after the initial greeting has completely finished playing
        if (
            greeting_finished
            and session.user_state == "listening"
            and session.agent_state == "listening"
        ):
            silence_timer_task = asyncio.create_task(run_silence_timer())

    def cancel_silence_timer():
        nonlocal silence_timer_task
        if silence_timer_task is not None:
            silence_timer_task.cancel()
            silence_timer_task = None

    def reset_silence_count():
        nonlocal silence_count
        silence_count = 0

    @session.on("user_state_changed")
    def on_user_state_changed(ev):
        logger.debug(f"User state changed: {ev.old_state} -> {ev.new_state}")
        if ev.new_state == "speaking":
            cancel_silence_timer()
            reset_silence_count()
        elif ev.new_state == "listening":
            start_silence_timer()

    @session.on("agent_state_changed")
    def on_agent_state_changed(ev):
        logger.debug(f"Agent state changed: {ev.old_state} -> {ev.new_state}")
        if ev.new_state == "speaking":
            assistant.call_tracker["agent_response_count"] += 1
            cancel_silence_timer()
        elif ev.new_state == "listening":
            start_silence_timer()

    def save_analytics_callback():
        if assistant.call_tracker.get("is_saved"):
            return
        assistant.call_tracker["is_saved"] = True

        ended_at = datetime.now(timezone.utc)
        started_at = assistant.call_tracker["started_at"]
        duration_seconds = (ended_at - started_at).total_seconds()

        outcome = "failed"
        failure_reason = None

        tracker = assistant.call_tracker

        if tracker["user_speech_count"] == 0:
            outcome = "failed"
            failure_reason = "No user speech detected"
        elif tracker["has_error"]:
            outcome = "failed"
            failure_reason = "Internal error during call"
        elif tracker["escalation_status"] == "requested":
            outcome = "failed"
            failure_reason = "Escalation requested but not completed"
        elif tracker["escalation_status"] == "failed":
            outcome = "failed"
            failure_reason = "Escalation creation failed"
        elif tracker["escalation_status"] == "created":
            outcome = "successful"
        elif tracker["lookup_status"] == "failed":
            outcome = "failed"
            failure_reason = "Healthcare facility lookup failed"
        elif tracker["opt_out_status"] == "failed":
            outcome = "failed"
            failure_reason = "Opt-out failed"
        elif tracker["opt_out_status"] == "success":
            outcome = "successful"
        elif tracker["user_speech_count"] > 0 and tracker["agent_response_count"] > 0:
            outcome = "successful"
        else:
            outcome = "failed"
            failure_reason = "Conversation did not reach a success state"

        try:
            AnalyticsService.save_call_analytics(
                session_id=ctx.job.id,
                started_at=started_at,
                ended_at=ended_at,
                duration_seconds=duration_seconds,
                channel="sip" if is_sip else "browser",
                language=assistant.current_lang,
                outcome=outcome,
                failure_reason=failure_reason
            )
            logger.info(f"Recorded call analytics: session_id={ctx.job.id}, outcome={outcome}, duration={duration_seconds:.1f}s")
        except Exception as e:
            logger.error(f"Failed to save call analytics: {e}")

    ctx.add_shutdown_callback(save_analytics_callback)

    @ctx.room.on("disconnected")
    def on_disconnected():
        logger.info("Room disconnected, triggering analytics save...")
        save_analytics_callback()

    # Await initial greeting completion, wait 0.8s pause, then enable silence monitoring
    async def finish_greeting():
        nonlocal greeting_finished
        try:
            await greeting_handle
        except Exception as e:
            logger.warning(f"Error waiting for initial greeting: {e}")
        await asyncio.sleep(0.8)
        greeting_finished = True
        start_silence_timer()

    asyncio.create_task(finish_greeting())


if __name__ == "__main__":
    cli.run_app(server)
