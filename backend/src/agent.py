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
)
try:
    from services.memory_service import MemoryService
except ImportError:
    from .services.memory_service import MemoryService
from livekit.plugins import murf, silero, google, deepgram, noise_cancellation
from livekit.plugins.turn_detector.multilingual import MultilingualModel

logger = logging.getLogger("agent")

load_dotenv(".env.local")

def get_system_prompt(lang: str, is_guest: bool = False) -> str:
    # Build language-specific constraints and prompt structures
    if lang == "English":
        lang_instruction = "Language: You MUST respond and speak ENTIRELY in English. Do NOT use any Hindi, Hinglish, or Devanagari words under any circumstances."
        examples = (
            "Examples:\n"
            "- User: 'I have headache since yesterday.' -> Reply: 'I understand you have had a headache since yesterday. Is the pain continuous or does it come and go?'\n"
            "- User: 'I have fever and body pain.' -> Reply: 'I see. You have a fever along with body pain. Have you checked your temperature?'"
        )
        consent_example = "'Can I save your preferred language and step goal?'"
        lookup_unclear_prompt = "'I heard Ponda, Goa. Is that what you meant?' or 'Did you mean Dehradun?'"
        no_location_prompt = "'Which city, area, or district should I search?'"
        failure_prompt = "'I\\'m unable to access the healthcare facility data right now. Please try again shortly.'"
    elif lang == "Hindi":
        lang_instruction = "Language: You MUST respond and speak ENTIRELY in Hindi using Devanagari script. Do NOT use English or Hinglish words."
        examples = (
            "Examples:\n"
            "- User: 'मुझे कल से सिरदर्द है।' -> Reply: 'समझ गया। आपको कल से सिरदर्द है। क्या सिरदर्द लगातार हो रहा है या कभी-कभी?'\n"
            "- User: 'मुझे बुखार और शरीर में दर्द है।' -> Reply: 'मैं समझ सकता हूँ। आपको बुखार के साथ शरीर में दर्द भी है। क्या आपने अपना तापमान चेक किया है?'"
        )
        consent_example = "'क्या मैं आपकी पसंदीदा भाषा और स्टेप गोल सेव कर सकती हूँ?'"
        lookup_unclear_prompt = "'मैंने पोंडा, गोवा सुना। क्या आपका यही मतलब था?' या 'क्या आपका मतलब देहरादून था?'"
        no_location_prompt = "'आप किस शहर, क्षेत्र या जिले में खोजना चाहते हैं?'"
        failure_prompt = "'मैं इस समय स्वास्थ्य केंद्र की जानकारी नहीं देख पा रही हूँ। कृपया कुछ समय बाद फिर से प्रयास करें।'"
    else:  # Hinglish
        lang_instruction = "Language: You MUST respond and speak in Hinglish (a natural mix of Hindi and English written in Latin script)."
        examples = (
            "Examples:\n"
            "- User: 'Mujhe headache hai since yesterday.' -> Reply: 'Samajh gaya. Aapko kal se headache hai. Kya headache continuous hai ya kabhi-kabhi ho raha hai?'\n"
            "- User: 'I have fever but body pain bhi ho raha hai.' -> Reply: 'I understand. Aapko fever ke saath body pain bhi ho raha hai. Have you checked your temperature?'"
        )
        consent_example = "'Kya main aapki preferred language aur step goal save kar sakta hoon?'"
        lookup_unclear_prompt = "'Mujhe Ponda, Goa sunai diya. Kya aapka wahi matlab tha?' or 'Kya aapka matlab Dehradun tha?'"
        no_location_prompt = "'Aap kis city, area, ya district mein search karna chahte hain?'"
        failure_prompt = "'Main abhi healthcare facilities ki details nahi dekh paa rahi hoon. Please thodi der baad try karein.'"

    if is_guest:
        memory_instruction = "- Since this is a guest session, do NOT call the `lookup_caller` tool.\n"
    else:
        memory_instruction = "- You must call the `lookup_caller` tool at the start of the conversation to retrieve any existing profile/memory.\n"

    prompt = (
        f"You are Aarogyam, an AI Health & Wellness Voice Assistant. You are NOT a doctor and never claim to replace one.\n"
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
        f"HEALTHCARE FACILITY LOOKUP:\n"
        f"- You can search for nearby hospitals, clinics, and doctors using the `lookup_healthcare_facilities` tool.\n"
        f"- If the user asks for a healthcare facility 'near me', 'nearby', 'closest', 'nearest', or otherwise asks for a facility without specifying a location name:\n"
        f"  1. First check the wellness facts returned by `lookup_caller` in the conversation history.\n"
        f"  2. If a general location (e.g. city/district/area like 'lives in Jaipur' or 'district is Dehradun') is clearly present in the saved facts, extract it and call `lookup_healthcare_facilities` directly with that location name. Do NOT ask the user for a location that is already saved in memory.\n"
        f"  3. If no general location is saved in memory, verbally prompt the user for their city, area, or district first (e.g., {no_location_prompt}).\n"
        f"- If the user explicitly specifies a location in the current message (e.g. 'Find a clinic in Dehradun'), ALWAYS prioritize and use that explicit location over the saved location from memory.\n"
        f"- You MUST NOT call the `lookup_healthcare_facilities` tool if you do not know the user's target location (from either the current query or the saved facts).\n"
        f"- Never use precise location data (exact coordinates, exact addresses) for the lookup; only search for general cities, districts, or areas.\n"
        f"- If the target location (whether from query or memory) is ambiguous, phonetically garbled, or unclear (e.g. 'Por de era dum'), you must NOT call the tool. Instead, ask the user to confirm/clarify (e.g., {lookup_unclear_prompt}). Only after they confirm should you invoke the tool.\n"
        f"- When responding after a healthcare facility tool call, treat the tool response's `session_language` field as authoritative for the response language. Do not infer the response language from facility names, location names, JSON content, or tool responses. If `session_language` is English, respond entirely in English. If it is Hinglish, respond in Hinglish. If it is Hindi, respond in Hindi.\n"
        f"- After a successful lookup, summarize only the top 2 to 3 facilities. Mention the location searched, and clearly attribute the information to OpenStreetMap contributors. Tell the user to verify availability or hours before visiting. Do NOT claim the data is government-certified.\n"
        f"- If the lookup fails, state: {failure_prompt}.\n"
        f"- Do NOT invent, guess, or fabricate facility names, addresses, or hours.\n"
        f"Style: Max 2-3 short sentences. NEVER use markdown (no * or **, lists, or bullet points). Use simple conversational language without medical jargon.\n"
        f"First Response: If no assistant greeting or message has been spoken yet in the conversation history, greet the user warmly. Otherwise, if a greeting was already spoken, do NOT greet or introduce yourself again; start directly by acknowledging their query."
    )
    return prompt

SYSTEM_PROMPT = get_system_prompt("Hinglish")

def update_assistant_prompt(assistant, lang: str) -> None:
    is_guest = getattr(assistant, "is_guest", False)
    new_prompt = get_system_prompt(lang, is_guest=is_guest)
    assistant._instructions = new_prompt
    if hasattr(assistant, "_chat_ctx") and assistant._chat_ctx is not None:
        for item in assistant._chat_ctx._items:
            if hasattr(item, "role") and item.role == "system":
                item.content = new_prompt


def detect_language(text: str) -> str:
    if not text:
        return "Hinglish"

    text = text.lower().strip()
    
    # Check for Devanagari script (Unicode range: 0900 to 097F)
    has_devanagari = any(0x0900 <= ord(char) <= 0x097F for char in text)
    if has_devanagari:
        return "Hindi"

    # Common Hindi/Hinglish vocabulary mapping
    hindi_hinglish_words = {
        "hai", "hain", "hoon", "aap", "tum", "mera", "meri", "mujhe", "kya", 
        "haan", "na", "nahi", "nhi", "ji", "karo", "kaise", "thik", "theek", 
        "se", "ko", "par", "ek", "aur", "ya", "bhi", "yeh", "woh", "sath",
        "swasthya", "dard", "bukhar", "sir", "sar", "pet", "bimari", "doctor",
        "dawa", "namaste", "namaskar", "pranam"
    }

    words = text.split()
    hindi_word_count = sum(1 for w in words if w in hindi_hinglish_words)
    
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
        "goodbye": "It looks like there are no more questions for now. I'm here whenever you need me. Take care."
    },
    "Hindi": {
        "prompt1": "मैं यहीं हूँ। जब आप तैयार हों, अपना सवाल पूछ सकते हैं।",
        "goodbye": "लगता है अभी कोई और सवाल नहीं है। जब भी ज़रूरत हो, मैं यहीं हूँ। अपना ख्याल रखिए।"
    },
    "Hinglish": {
        "prompt1": "Main yahin hoon. Jab aap ready hon, apna question pooch sakte hain.",
        "goodbye": "Lagta hai filhaal koi aur question nahi hai. Jab bhi zarurat ho, main yahin hoon. Apna khayal rakhiye."
    }
}

GREETINGS = [
    "Namaste! Main Aarogyam hoon, aapka AI Health Assistant. Main general health guidance, healthy lifestyle tips aur common health-related questions mein aapki madad kar sakta hoon. Main doctor nahi hoon aur diagnosis ya prescription provide nahi karta. Batayiye, aaj main aapki kis tarah madad kar sakta hoon?",
    "Namaste! Aarogyam AI Health Companion mein aapka swagat hai. Main aapko health and wellness tips, healthy habits aur general medical queries par guidance de sakta hoon. Main koi professional doctor nahi hoon, isliye diagnosis ya medication nahi de sakta. Aaj main aapki kya madad karoon?",
    "Namaste! Main Aarogyam AI Assistant bol raha hoon. Yahan main aapki wellness, nutrition aur daily health habits se jude sawaalon mein madad karne ke liye hoon. Main professional medical advice ya prescription nahi deta hoon. Batayiye, aaj aap apne swasthya ke baare mein kya poochna chahenge?"
]


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
    params = {
        "q": location,
        "format": "json",
        "limit": 1,
        "countrycodes": "in"
    }
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(params)
    
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "AarogyamHealthAccessAgent/1.0 (contact: support@aarogyam.ai)"
        }
    )
    
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            if response.status != 200:
                logger.error(f"Nominatim API returned HTTP {response.status}")
                return None
            data = json.loads(response.read().decode("utf-8"))
            if not data:
                logger.warning(f"Nominatim returned empty results for location: {location}")
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
            "Content-Type": "application/x-www-form-urlencoded"
        }
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
                for tag_name in ["addr:street", "addr:suburb", "addr:city", "addr:postcode"]:
                    val = tags.get(tag_name)
                    if val:
                        addr_parts.append(val)
                address = ", ".join(addr_parts) if addr_parts else "Location details not available"
                
                facilities.append({
                    "name": name,
                    "type": tags.get("amenity", "healthcare_facility").replace("_", " ").title(),
                    "address": address,
                    "distance_km": round(dist, 2),
                    "lat": elem_lat,
                    "lon": elem_lon
                })
            
            facilities.sort(key=lambda x: x["distance_km"])
            return facilities
    except Exception as e:
        logger.error(f"Failed to fetch nearby facilities from Overpass: {e}")
        return []


class Assistant(Agent):
    def __init__(self, user_id: str = "guest_session", user_name: str = "Guest", is_guest: bool = True) -> None:
        self.user_id = user_id
        self.user_name = user_name
        self.is_guest = is_guest
        self.current_lang = "Hinglish"
        super().__init__(instructions=get_system_prompt("Hinglish", is_guest=is_guest))

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
        fetched_at = datetime.now(timezone.utc).isoformat()
        session_lang = getattr(self, "current_lang", "Hinglish")
        
        # 1. Geocode the location
        geocoded = await asyncio.to_thread(_geocode_location, location)
        if not geocoded:
            result = {
                "status": "failed",
                "reason": f"Could not geocode or locate '{location}' in India.",
                "fetched_at": fetched_at,
                "session_language": session_lang,
                "source": "OpenStreetMap contributors"
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
            result = {
                "status": "failed",
                "reason": f"No healthcare facilities found within 5km of '{display_name}'.",
                "fetched_at": fetched_at,
                "session_language": session_lang,
                "source": "OpenStreetMap contributors"
            }
            return json.dumps(result, ensure_ascii=False)
        
        # Return success with facilities
        result = {
            "status": "success",
            "location": display_name,
            "coordinates": {
                "lat": lat,
                "lon": lon
            },
            "facilities": top_facilities,
            "fetched_at": fetched_at,
            "session_language": session_lang,
            "source": "OpenStreetMap contributors"
        }
        return json.dumps(result, ensure_ascii=False)


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

    if user_participant:
        user_id = user_participant.identity
        user_name = user_participant.name or "Guest"
        is_guest = False
    else:
        # Safe non-persistent Guest path
        user_id = "guest_session"
        user_name = "Guest"
        is_guest = True

    assistant = Assistant(user_id=user_id, user_name=user_name, is_guest=is_guest)
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
                if pref_lang == "English":
                    greeting = f"Welcome back, {record.name}. I remember your previous preferences. How can I help you today?"
                elif pref_lang == "Hindi":
                    greeting = f"नमस्ते {record.name}। वापस स्वागत है। मुझे आपकी पिछली पसंद याद है। आज मैं आपकी कैसे मदद करूँ?"
                else:  # Hinglish / fallback
                    greeting = f"Welcome back {record.name}! Mujhe aapki previous preferences yaad hain. Aaj main aapki kya help karoon?"
                logger.info(f"Greeting returning caller {record.name} with language preference: {pref_lang}")
        except Exception as e:
            logger.error(f"Error querying returning caller for greeting: {e}")

    if not greeting:
        greeting = random.choice(GREETINGS)
        logger.info("Greeting new caller with random default greeting.")

    assistant.current_lang = current_session_lang
    # Update assistant instructions synchronously first to avoid race conditions
    update_assistant_prompt(assistant, current_session_lang)
    # Also update asynchronously via the SDK method
    await assistant.update_instructions(get_system_prompt(current_session_lang))
    greeting_handle = session.say(greeting, allow_interruptions=False)

    # Track if the greeting has completely finished playing
    greeting_finished = False

    # Track the last user speech text for language-aware silence prompting
    last_user_text = ""

    @session.on("user_input_transcribed")
    def on_user_input_transcribed(ev: UserInputTranscribedEvent):
        nonlocal last_user_text, current_session_lang
        if ev.is_final and ev.transcript:
            text = ev.transcript
            last_user_text = text
            # Dynamically update session language if user explicitly switches language
            current_session_lang = detect_language(text)
            assistant.current_lang = current_session_lang
            logger.info(f"User speech committed: '{text}'. Detected language: {current_session_lang}")
            # Update instructions synchronously to avoid race conditions
            update_assistant_prompt(assistant, current_session_lang)
            # Also trigger the async task for any internal SDK side-effects
            asyncio.create_task(assistant.update_instructions(get_system_prompt(current_session_lang)))

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
                session.say(
                    prompts["prompt1"],
                    allow_interruptions=True
                )
                start_silence_timer()
            elif silence_count == 1:
                # 2nd silence is 10 seconds
                await asyncio.sleep(10.0)
                silence_count = 2
                logger.info(f"Silence detected twice. Language: {lang}. Saying goodbye and shutting down.")
                speech_handle = session.say(
                    prompts["goodbye"],
                    allow_interruptions=False
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
        if greeting_finished and session.user_state == "listening" and session.agent_state == "listening":
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
            cancel_silence_timer()
        elif ev.new_state == "listening":
            start_silence_timer()

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
