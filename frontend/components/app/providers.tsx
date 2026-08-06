'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// ==========================================
// 1. AUTHENTICATION CONTEXT & PROVIDER
// ==========================================

export interface User {
  name: string;
  email: string;
  joinedDate: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, name?: string) => Promise<boolean>;
  signup: (name: string, email: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('aarogyam_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, name?: string) => {
    setIsLoading(true);
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 800));
    
    // Simple local-storage-based lookup
    const usersRaw = localStorage.getItem('aarogyam_registered_users');
    const users = usersRaw ? JSON.parse(usersRaw) : [];
    
    const existing = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
    
    if (existing) {
      const loggedUser = {
        name: existing.name,
        email: existing.email,
        joinedDate: existing.joinedDate || new Date().toLocaleDateString(),
      };
      setUser(loggedUser);
      localStorage.setItem('aarogyam_user', JSON.stringify(loggedUser));
      setIsLoading(false);
      return true;
    }

    // Default mock user if not registered yet
    const defaultUser = {
      name: name || email.split('@')[0],
      email: email,
      joinedDate: new Date().toLocaleDateString(),
    };
    setUser(defaultUser);
    localStorage.setItem('aarogyam_user', JSON.stringify(defaultUser));
    
    // Save to registered list
    users.push(defaultUser);
    localStorage.setItem('aarogyam_registered_users', JSON.stringify(users));
    
    setIsLoading(false);
    return true;
  };

  const signup = async (name: string, email: string) => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    
    const usersRaw = localStorage.getItem('aarogyam_registered_users');
    const users = usersRaw ? JSON.parse(usersRaw) : [];
    
    // Check if exists
    const exists = users.some((u: any) => u.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      setIsLoading(false);
      return false;
    }
    
    const newUser = {
      name,
      email,
      joinedDate: new Date().toLocaleDateString(),
    };
    
    users.push(newUser);
    localStorage.setItem('aarogyam_registered_users', JSON.stringify(users));
    
    // Auto login after signup
    setUser(newUser);
    localStorage.setItem('aarogyam_user', JSON.stringify(newUser));
    
    setIsLoading(false);
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('aarogyam_user');
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// ==========================================
// 2. LANGUAGE CONTEXT & PROVIDER
// ==========================================

export type Language =
  | 'English'
  | 'हिन्दी'
  | 'বাংলা'
  | 'தமிழ்'
  | 'తెలుగు'
  | 'ગુજરાતી'
  | 'ಕನ್ನಡ'
  | 'മലയാളം'
  | 'मराठी'
  | 'ਪੰਜਾਬੀ'
  | 'ଓଡ଼ିଆ'
  | 'অসমীয়া';

// Comprehensive translation dictionaries
const translations: Record<Language, Record<string, string>> = {
  English: {
    premiumAi: 'Premium AI healthcare, designed for Bharat',
    titlePart1: 'Healthcare that Listens.',
    titlePart2: 'Guidance that Cares.',
    subtitle: 'Your AI Voice Health Companion for Bharat.',
    description: 'Aarogyam is an AI-powered multilingual voice health companion designed to make healthcare guidance more accessible, conversational, and inclusive across Bharat.',
    listening: 'Listening...',
    userQuote: '“I have had a fever since yesterday.”',
    aarogyamResponse: '“I can help explain your symptoms and suggest safe next steps, but I don’t replace a healthcare professional.”',
    talkToAarogyam: 'Talk to Aarogyam',
    learnMore: 'Learn More',
    privacyFirst: 'Privacy First',
    privacyDesc: 'Secure by design, with calm, trustworthy interactions at every step.',
    builtForBharat: 'Built for Bharat',
    builtDesc: 'Multilingual support designed to feel local, respectful, and inclusive.',
    voiceFirst: 'Voice First',
    voiceDesc: 'A seamless voice experience that makes care feel natural and effortless.',
    realTimeAi: 'Real-Time AI',
    realTimeDesc: 'Instantly responsive guidance that feels fast, polished, and human.',
    coreCapabilities: 'Core capabilities',
    premiumLayer: 'A premium intelligence layer for accessible care',
    premiumLayerDesc: 'Every interaction is crafted to feel effortless, reassuring, and deeply human.',
    howItWorks: 'How it Works',
    threeSimpleSteps: 'Three simple steps to better support',
    threeSimpleStepsDesc: 'From a brief voice prompt to helpful health guidance in seconds.',
    speakNaturally: 'Speak Naturally',
    speakNaturallyDesc: 'Start with a simple voice prompt and describe what matters to you.',
    aiUnderstands: 'AI Understands',
    aiUnderstandsDesc: 'Aarogyam listens, brings context together, and adapts to your needs.',
    getGuidance: 'Get Helpful Guidance',
    getGuidanceDesc: 'Receive safe, friendly health guidance and next-step support.',
    whyAarogyam: 'Why Aarogyam',
    voiceFirstSupport: 'Voice-first support that feels calm, useful, and deeply human.',
    dignifiedGuidance: 'Designed for people who want dignified guidance without friction, whether they are seeking everyday wellness support or a helpful first step.',
    readyToBegin: 'Ready to begin?',
    readyToExperience: 'Ready to experience AI-powered healthcare?',
    meetCompanion: 'Meet a calm, intelligent voice companion designed for thoughtful care.',
    startTalking: 'Start Talking',
    home: 'Home',
    features: 'Features',
    howItWorksNav: 'How it Works',
    about: 'About',
    contact: 'Contact',
    signIn: 'Sign In',
    getStarted: 'Get Started',
    dashboard: 'Dashboard',
    logout: 'Logout',
  },
  'हिन्दी': {
    premiumAi: 'भारत के लिए डिज़ाइन की गई प्रीमियम एआई स्वास्थ्य सेवा',
    titlePart1: 'स्वास्थ्य सेवा जो सुनती है।',
    titlePart2: 'मार्गदर्शन जो परवाह करता है।',
    subtitle: 'भारत के लिए आपका एआई वॉयस हेल्थ साथी।',
    description: 'आरोग्यम एक एआई-संचालित बहुभाषी वॉयस हेल्थ साथी है जिसे पूरे भारत में स्वास्थ्य सेवा मार्गदर्शन को अधिक सुलभ, संवादात्मक और समावेशी बनाने के लिए डिज़ाइन किया गया है।',
    listening: 'सुन रहा है...',
    userQuote: '“मुझे कल से बुखार है।”',
    aarogyamResponse: '“मैं आपके लक्षणों को समझने और सुरक्षित कदम उठाने में मदद कर सकता हूँ, लेकिन मैं डॉक्टर का विकल्प नहीं हूँ।”',
    talkToAarogyam: 'आरोग्यम से बात करें',
    learnMore: 'और जानें',
    privacyFirst: 'गोपनीयता पहले',
    privacyDesc: 'डिजाइन द्वारा सुरक्षित, हर कदम पर शांत और भरोसेमंद बातचीत के साथ।',
    builtForBharat: 'भारत के लिए निर्मित',
    builtDesc: 'स्थानीय, सम्मानजनक और समावेशी महसूस करने के लिए डिज़ाइन किया गया बहुभाषी समर्थन।',
    voiceFirst: 'आवाज पहले',
    voiceDesc: 'एक निर्बाध आवाज अनुभव जो स्वास्थ्य देखभाल को सहज और आसान बनाता है।',
    realTimeAi: 'तत्काल एआई',
    realTimeDesc: 'तुरंत प्रतिक्रिया देने वाला मार्गदर्शन जो तेज, परिष्कृत और मानवीय लगता है।',
    coreCapabilities: 'मुख्य क्षमताएं',
    premiumLayer: 'सुलभ देखभाल के लिए एक प्रीमियम बुद्धिमत्ता स्तर',
    premiumLayerDesc: 'हर बातचीत को सहज, आश्वस्त करने वाला और मानवीय बनाने के लिए तैयार किया गया है।',
    howItWorks: 'यह कैसे काम करता है',
    threeSimpleSteps: 'बेहतर सहायता के लिए तीन सरल कदम',
    threeSimpleStepsDesc: 'एक छोटे से वॉयस संकेत से सेकंड में उपयोगी स्वास्थ्य मार्गदर्शन प्राप्त करें।',
    speakNaturally: 'सहजता से बोलें',
    speakNaturallyDesc: 'एक साधारण वॉयस संकेत के साथ शुरू करें और बताएं कि आपके लिए क्या मायने रखता है।',
    aiUnderstands: 'एआई समझता है',
    aiUnderstandsDesc: 'आरोग्यम सुनता है, संदर्भ को एक साथ लाता है, और आपकी आवश्यकताओं के अनुसार ढलता है।',
    getGuidance: 'मददगार मार्गदर्शन प्राप्त करें',
    getGuidanceDesc: 'सुरक्षित, मित्रवत स्वास्थ्य मार्गदर्शन और अगले कदम की सहायता प्राप्त करें।',
    whyAarogyam: 'आरोग्यम क्यों',
    voiceFirstSupport: 'आवाज-प्रथम सहायता जो शांत, उपयोगी और मानवीय लगती है।',
    dignifiedGuidance: 'उन लोगों के लिए डिज़ाइन किया गया है जो बिना किसी घर्षण के सम्मानजनक मार्गदर्शन चाहते हैं, चाहे वे दैनिक कल्याण सहायता या कोई मददगार कदम तलाश रहे हों।',
    readyToBegin: 'शुरू करने के लिए तैयार हैं?',
    readyToExperience: 'एआई-संचालित स्वास्थ्य सेवा का अनुभव करने के लिए तैयार हैं?',
    meetCompanion: 'विचारशील देखभाल के लिए डिज़ाइन किए गए एक शांत, बुद्धिमान वॉयस साथी से मिलें।',
    startTalking: 'बात करना शुरू करें',
    home: 'होम',
    features: 'विशेषताएं',
    howItWorksNav: 'यह कैसे काम करता है',
    about: 'हमारे बारे में',
    contact: 'संपर्क',
    signIn: 'साइन इन',
    getStarted: 'शुरू करें',
    dashboard: 'डैशबोर्ड',
    logout: 'लॉगआउट',
  },
  'বাংলা': {
    premiumAi: 'ভারতের জন্য ডিজাইন করা প্রিমিয়াম এআই স্বাস্থ্যসেবা',
    titlePart1: 'স্বাস্থ্যসেবা যা শোনে।',
    titlePart2: 'নির্দেশনা যা যত্ন নেয়।',
    subtitle: 'ভারতের জন্য আপনার এআই ভয়েস হেলথ সঙ্গী।',
    description: 'আরোগ্যম হল একটি এআই-চালিত বহুভাষিক ভয়েস হেলথ সঙ্গী যা ভারতজুড়ে স্বাস্থ্যসেবা নির্দেশিকাকে আরও অ্যাক্সেসযোগ্য, কথোপকথনমূলক এবং অন্তর্ভুক্তিমূলক করার জন্য ডিজাইন করা হয়েছে।',
    listening: 'শুনছে...',
    userQuote: '“আমার গতকাল থেকে জ্বর হয়েছে।”',
    aarogyamResponse: '“আমি আপনার লক্ষণগুলি ব্যাখ্যা করতে এবং নিরাপদ পরবর্তী পদক্ষেপের পরামর্শ দিতে সাহায্য করতে পারি, তবে আমি চিকিৎসকের বিকল্প নই।”',
    talkToAarogyam: 'আরোগ্যমের সাথে কথা বলুন',
    learnMore: 'আরও জানুন',
    privacyFirst: 'গোপনীয়তা প্রথম',
    privacyDesc: 'ডিজাইন দ্বারা সুরক্ষিত, প্রতিটি পদক্ষেপে শান্ত এবং বিশ্বস্ত মিথস্ক্রিয়া সহ।',
    builtForBharat: 'ভারতের জন্য তৈরি',
    builtDesc: 'স্থানীয়, সম্মানজনক এবং অন্তর্ভুক্তিমূলক অনুভূতি দেওয়ার জন্য ডিজাইন করা বহুভাষিক সমর্থন।',
    voiceFirst: 'ভয়েস প্রথম',
    voiceDesc: 'একটি নিরবচ্ছিন্ন ভয়েস অভিজ্ঞতা যা স্বাস্থ্যসেবাকে স্বাভাবিক এবং সহজ করে তোলে।',
    realTimeAi: 'রিয়েল-টাইม এআই',
    realTimeDesc: 'অনতিবিলম্বে প্রতিক্রিয়াশীল গাইডেন্স যা দ্রুত, মার্জিত এবং মানুষের মতো অনুভব করায়।',
    coreCapabilities: 'মূল ক্ষমতা',
    premiumLayer: 'সহজলভ্য যত্নের জন্য একটি প্রিমিয়াম ইন্টেলিজেন্স স্তর',
    premiumLayerDesc: 'প্রতিটি মিথস্ক্রিয়া সহজ, আশ্বস্তকারী এবং গভীরভাবে মানবিক করার জন্য তৈরি করা হয়েছে।',
    howItWorks: 'কিভাবে কাজ করে',
    threeSimpleSteps: 'উন্নত সহায়তার জন্য তিনটি সহজ পদক্ষেপ',
    threeSimpleStepsDesc: 'একটি সংক্ষিপ্ত ভয়েস প্রম্পট থেকে সেকেন্ডের মধ্যে দরকারী স্বাস্থ্য নির্দেশিকা।',
    speakNaturally: 'স্বাভাবিকভাবে কথা বলুন',
    speakNaturallyDesc: 'একটি সাধারণ ভয়েস প্রম্পট দিয়ে শুরু করুন এবং আপনার সমস্যা বর্ণনা করুন।',
    aiUnderstands: 'এআই বোঝে',
    aiUnderstandsDesc: 'আরোগ্যম শোনে, প্রসঙ্গ একসাথে নিয়ে আসে এবং আপনার প্রয়োজনের সাথে খাপ খাইয়ে নেয়।',
    getGuidance: 'সহায়ক নির্দেশনা পান',
    getGuidanceDesc: 'নিরাপদ, বন্ধুত্বপূর্ণ স্বাস্থ্য নির্দেশিকা এবং পরবর্তী পদক্ষেপের সহায়তা পান।',
    whyAarogyam: 'কেন আরোগ্যম',
    voiceFirstSupport: 'ভয়েস-ফার্স্ট সাপোর্ট যা শান্ত, দরকারী এবং গভীরভাবে মানবিক অনুভব করায়।',
    dignifiedGuidance: 'যারা ঝামেলা ছাড়াই সম্মানজনক নির্দেশনা চান তাদের জন্য ডিজাইন করা হয়েছে, তারা প্রতিদিনের সুস্থতার জন্য সমর্থন খুঁজছেন বা কোনো সহায়ক পদক্ষেপ চাইছেন।',
    readyToBegin: 'শुरू করতে প্রস্তুত?',
    readyToExperience: 'এআই-চালিত স্বাস্থ্যসেবার অভিজ্ঞতা নিতে প্রস্তুত?',
    meetCompanion: 'চিন্তাশীল যত্নের জন্য ডিজাইন করা একটি শান্ত, বুদ্ধিমান ভয়েস সঙ্গীর সাথে দেখা করুন।',
    startTalking: 'কথা বলা শুরু করুন',
    home: 'হোম',
    features: 'বৈশিষ্ট্য',
    howItWorksNav: 'কিভাবে কাজ করে',
    about: 'সম্পর্কে',
    contact: 'যোগাযোগ',
    signIn: 'সাইন ইন',
    getStarted: 'শুরু করুন',
    dashboard: 'ড্যাশবোর্ড',
    logout: 'লগআউট',
  },
  'தமிழ்': {
    premiumAi: 'பாரதத்திற்காக வடிவமைக்கப்பட்ட பிரீமியம் AI சுகாதார சேவை',
    titlePart1: 'கேட்கும் ஆரோக்கிய சேவை.',
    titlePart2: 'அன்பான வழிகாட்டுதல்.',
    subtitle: 'பாரதத்திற்கான உங்கள் AI குரல் சுகாதார துணை.',
    description: 'ஆரோக்யம் என்பது ஒரு AI-இயங்கும் பன்மொழி குரல் சுகாதார துணையாகும், Windows 11 இல் ஆரோக்யம் குரல் வழிகாட்டுதலை எளிதாக அணுக முடியும்.',
    listening: 'கேட்கிறது...',
    userQuote: '“எனக்கு நேற்று முதல் காய்ச்சலாக இருக்கிறது.”',
    aarogyamResponse: '“உங்கள் அறிகுறிகளை விளக்கவும் பாதுகாப்பான அடுத்த படிகளை பரிந்துரைக்கவும் நான் உதவ முடியும், ஆனால் நான் மருத்துவருக்கு மாற்றீடல்ல.”',
    talkToAarogyam: 'ஆரோக்யமுடன் பேசுங்கள்',
    learnMore: 'மேலும் அறிய',
    privacyFirst: 'தனியுரிமைக்கு முதலிடம்',
    privacyDesc: 'வடிவமைப்பால் பாதுகாப்பானது, ஒவ்வொரு அடியிலும் அமைதியான, நம்பகமான தொடர்புகளுடன்.',
    builtForBharat: 'பாரதத்திற்காக உருவாக்கப்பட்டது',
    builtDesc: 'உள்ளூர், மரியாதைக்குரிய மற்றும் உள்ளடக்கியதாக உணர வடிவமைக்கப்பட்ட பன்மொழி ஆதரவு.',
    voiceFirst: 'குரலுக்கு முதلیடம்',
    voiceDesc: 'ஆரோக்கியத்தை இயற்கையாகவும் சிரமமின்றியும் மாற்றும் தடையற்ற குரல் अनुभव.',
    realTimeAi: 'நிகழ்நேர AI',
    realTimeDesc: 'வேகமாகவும், நேர்த்தியாகவும், மனிதர்களைப் போலவும் உணரும் உடனடியாக பதிலளிக்கும் வழிகாட்டுதல்.',
    coreCapabilities: 'முக்கிய திறன்கள்',
    premiumLayer: 'எளிதான பராமரிப்பிற்கான பிரீமியம் நுண்ணறிவு அடுக்கு',
    premiumLayerDesc: 'ஒவ்வொரு தொடர்பும் சிரமமின்றி, நிம்மதியாகவும், ஆழமான மனிதநேயத்துடனும் வடிவமைக்கப்பட்டுள்ளது.',
    howItWorks: 'எப்படி வேலை செய்கிறது',
    threeSimpleSteps: 'சிறந்த ஆதரவிற்கான மூன்று எளிய படிகள்',
    threeSimpleStepsDesc: 'ஒரு எளிய குரல் தூண்டுதலிலிருந்து சில நொடிகளில் பயனுள்ள சுகாதார வழிகாட்டுதல்.',
    speakNaturally: 'இயல்பாகப் பேசுங்கள்',
    speakNaturallyDesc: 'ஒரு எளிய குரல் குறிப்புடன் தொடங்கி உங்களுக்கு முக்கிய மானதை விளக்குங்கள்.',
    aiUnderstands: 'AI புரிந்து கொள்கிறது',
    aiUnderstandsDesc: 'ஆரோக்யம் கேட்கிறது, சூழலை ஒருங்கிணைக்கிறது, உங்கள் தேவைகளுக்கு ஏற்ப மாற்றியமைக்கிறது.',
    getGuidance: 'உதவிகரமான வழிகாட்டுதலைப் பெறுங்கள்',
    getGuidanceDesc: 'பாதுகாப்பான, நட்புரீதியான சுகாதார வழிகாட்டுதலையும் அடுத்தகட்ட ஆதரவையும் பெறுங்கள்.',
    whyAarogyam: 'ஏன் ஆரோக்யம்',
    voiceFirstSupport: 'அமைதியான, பயனுள்ள மற்றும் மனிதநேயமிக்க குரல்-முதல் ஆதரவு.',
    dignifiedGuidance: 'தினசரி ஆரோக்கிய ஆதரவாக இருந்தாலும் சரி அல்லது பயனுள்ள முதல் படியாக இருந்தாலும் சரி, சிரமமின்றி மரியாதையான வழிகாட்டுதலை விரும்புபவர்களுக்காக வடிவமைக்கப்பட்டது.',
    readyToBegin: 'தொடங்க தயாரா?',
    readyToExperience: 'AI-இயங்கும் சுகாதார சேவையை அனுபவிக்க தயாரா?',
    meetCompanion: 'சிந்தனையுள்ள கவனிப்புக்காக வடிவமைக்கப்பட்ட அமைதியான, புத்திசாலித்தனமான குரல் துணையை சந்தியுங்கள்.',
    startTalking: 'பேசத் தொடங்குங்கள்',
    home: 'முகப்பு',
    features: 'அம்சங்கள்',
    howItWorksNav: 'எப்படி வேலை செய்கிறது',
    about: 'பற்றி',
    contact: 'தொடர்பு',
    signIn: 'உள்நுழைக',
    getStarted: 'தொடங்குங்கள்',
    dashboard: 'டாஷ்போர்டு',
    logout: 'வெளியேறு',
  },
  'తెలుగు': {
    premiumAi: 'భారతదేశం కోసం రూపొందించబడిన ప్రీమియం AI ఆరోగ్య సంరక్షణ',
    titlePart1: 'వినే ఆరోగ్య సంరక్షణ.',
    titlePart2: 'ఆదరించే మార్గదర్శకత్వం.',
    subtitle: 'భారత్ కోసం మీ AI వాయిస్ హెల్త్ భాగస్వామి.',
    description: 'ఆరోగ్యం అనేది AI ఆధారిత బహుభాషా వాయిస్ హెల్త్ భాగస్వామి, ఇది భారతదేశం అంతటా ఆరోగ్య సంరక్షణ మార్గదర్శకత్వాన్ని మరింత సులభంగా వినడానికి రూపొందించబడింది.',
    listening: 'వింటున్నది...',
    userQuote: '“నాకు నిన్నటి నుండి జ్వరం ఉంది.”',
    aarogyamResponse: '“నేను మీ లక్షణాలను వివరించడానికి మరియు సురక్షితమైన తదుపరి చర్యలను సూచించడానికి సహాయపడగలను, కానీ నేను వైద్యుడికి ప్రత్యామ్నాయాన్ని కాదు.”',
    talkToAarogyam: 'ఆరోగ్యంతో మాట్లాడండి',
    learnMore: 'మరింత తెలుసుకోండి',
    privacyFirst: 'వ్యక్తిగత భద్రత మొదట',
    privacyDesc: 'ప్రతి దశలో ప్రశాంతమైన, నమ్మకమైన పరస్పర చర్యలతో సురక్షితమైన డిజైన్.',
    builtForBharat: 'భారత్ కోసం ప్రత్యేకం',
    builtDesc: 'స్థానికంగా, గౌరవప్రదంగా మరియు కలుపుగోలుతనంతో ఉండేలా రూపొందించబడిన బహుభాషా మద్దతు.',
    voiceFirst: 'వాయిస్ మొదట',
    voiceDesc: 'ఆరోగ్య సంరక్షణను సహజంగా మరియు శ్రమలేనిదిగా చేసే అతుకులు లేని వాయిస్ అనుభవం.',
    realTimeAi: 'రియల్ టైమ్ AI',
    realTimeDesc: 'వేగవంతంగా, పరిపూర్ణంగా మరియు మార్గదర్శకత్వంగా అనిపించే తక్షణ ప్రతిస్పందన.',
    coreCapabilities: 'కీలక సామర్థ్యాలు',
    premiumLayer: 'సులభమైన సంరక్షణ కోసం ప్రీమియం ఇంటెలిజెన్స్ లేయర్',
    premiumLayerDesc: 'ప్రతి పరస్పర చర్య శ్రమ లేకుండా, భరోసాగా మరియు లోతైన మానవీయంగా ఉండేలా రూపొందించబడింది.',
    howItWorks: 'ఎలా పని చేస్తుంది',
    threeSimpleSteps: 'మెరుగైన సహాయం కోసం మూడు సులభమైన దశలు',
    threeSimpleStepsDesc: 'చిన్న వాయిస్ ప్రాంప్ట్ నుండి క్షణాల్లో ఉపయోగకరమైన ఆరోగ్య మార్గదర్శకత్వం.',
    speakNaturally: 'సహజంగా మాట్లాడండి',
    speakNaturallyDesc: 'సాధారణ వాయిస్ ప్రాంప్ట్‌తో ప్రారంభించండి మరియు మీ సమస్యను వివరించండి.',
    aiUnderstands: 'AI అర్థం చేసుకుంటుంది',
    aiUnderstandsDesc: 'ఆరోగ్యం వింటుంది, సందర్భాన్ని గ్రహిస్తుంది మరియు మీ అవసరాలకు అనుగుణంగా మారుతుంది.',
    getGuidance: 'ఉపయోగకరమైన మార్గదర్శకత్వం పొందండి',
    getGuidanceDesc: 'సురక్షితమైన, స్నేహపూర్వక ఆరోగ్య మార్గదర్శకత్వం మరియు తదుపరి దశ మద్దతు పొందండి.',
    whyAarogyam: 'ఎందుకు ఆరోగ్యం',
    voiceFirstSupport: 'ప్రశాంతంగా, ఉపయోగకరంగా మరియు లోతైన మానవీయంగా అనిపించే వాయిస్-ఫస్ట్ మద్దతు.',
    dignifiedGuidance: 'రోజువారీ ఆరోగ్యం లేదా సహాయక మొదటి అడుగు కోసం శ్రమ లేకుండా గౌరవప్రదమైన మార్గదర్శకత్వాన్ని కోరుకునే వారి కోసం రూపొందించబడింది.',
    readyToBegin: 'ప్రారంభించడానికి సిద్ధంగా ఉన్నారా?',
    readyToExperience: 'AI-ఆధారిత ఆరోగ్య సంరక్షణను అనుభవించడానికి సిద్ధంగా ఉన్నారా?',
    meetCompanion: 'ఆలోచనాత్మకమైన సంరక్షణ కోసం రూపొందించిన ప్రశాంతమైన, తెలివైన వాయిస్ భాగస్వామిని కలవండి.',
    startTalking: 'మాట్లాడటం ప్రారంభించండి',
    home: 'హోమ్',
    features: 'ఫీచర్లు',
    howItWorksNav: 'ఎలా పని చేస్తుంది',
    about: 'గురించి',
    contact: 'సంప్రదించండి',
    signIn: 'సైన్ ఇన్',
    getStarted: 'ప్రారంభించండి',
    dashboard: 'డ్యాష్‌బోర్డ్',
    logout: 'లాగౌట్',
  },
  'ગુજરાતી': {
    premiumAi: 'ભારત માટે ખાસ તૈયાર કરેલ પ્રીમિયમ AI હેલ્થકેર',
    titlePart1: 'આરોગ્ય સેવા જે સાંભળે છે.',
    titlePart2: 'માર્ગદર્શન જે કાળજી રાખે છે.',
    subtitle: 'ભારત માટે તમારો AI વોઇસ હેલ્થ સાથીદાર.',
    description: 'આરોગ્યમ એ AI-સંચાલિત બહુભાષી વોઇસ હેલ્થ સાથીદાર છે જે આરોગ્ય માર્ગદર્શન માટે છે.',
    listening: 'સાંભળી રહ્યા છીએ...',
    userQuote: '“મને ગઈકાલથી તાવ આવ્યો છે.”',
    aarogyamResponse: '“હું તમારા લક્ષણોને સમજવામાં અને સુરક્ષિત પગલાં સૂચવવામાં મદદ કરી શકું છું, પરંતુ હું ડૉક્ટરનો વિકલ્પ નથી.”',
    talkToAarogyam: 'આરોગ્યમ સાથે વાત કરો',
    learnMore: 'વધુ જાણો',
    privacyFirst: 'ગોપનીયતા પ્રથમ',
    privacyDesc: 'ડિઝાઇન દ્વારા સુરક્ષિત, દરેક પગલે શાંત અને વિશ્વસનીય વાતચીત સાથે.',
    builtForBharat: 'ભારત માટે નિર્મિત',
    builtDesc: 'સ્થાનિક, આદરણીય અને સમાવેશી અનુભવ આપવા માટે રચાયેલ બહુભાષી સપોર્ટ.',
    voiceFirst: 'વોઇસ પ્રથમ',
    voiceDesc: 'એક અવિરત વોઇસ અનુભવ જે કાળજીને કુદરતી અને સરળ બનાવે છે.',
    realTimeAi: 'રીઅલ-ટાઇમ AI',
    realTimeDesc: 'ઝડપી, સુસંસ્કૃત અને માનવીય લાગે તેવું ત્વરિત પ્રતિભાવ માર્ગદર્શન.',
    coreCapabilities: 'મુખ્ય ક્ષમતાઓ',
    premiumLayer: 'સરળ સંભાળ માટે પ્રીમિયમ ઇન્ટેલિજન્સ લેયર',
    premiumLayerDesc: 'દરેક વાતચીત સરળ, આશ્વાસન આપનારી અને ઊંડી માનવીય લાગે તે રીતે તૈયાર કરવામાં આવી છે.',
    howItWorks: 'તે કેવી રીતે કામ કરે છે',
    threeSimpleSteps: 'વધુ સારા સપોર્ટ માટે ત્રણ સરળ પગલાં',
    threeSimpleStepsDesc: 'એક ટૂંકા વોઇસ પ્રોમ્પ્ટથી સેકંડમાં ઉપયોગી આરોગ્ય માર્ગદર્શન.',
    speakNaturally: 'કુદરતી રીતે બોલો',
    speakNaturallyDesc: 'એક સરળ વોઇસ પ્રોમ્પ્ટથી શરૂ કરો અને તમારી ચિંતા વ્યક્ત કરો.',
    aiUnderstands: 'AI સમજે છે',
    aiUnderstandsDesc: 'આરોગ્યમ સાંભળે છે, સંદર્ભને એકસાથે લાવે છે અને તમારી જરૂરિયાતોને અનુકૂળ બને છે.',
    getGuidance: 'મદદરૂપ માર્ગદર્શન મેળવો',
    getGuidanceDesc: 'સુરક્ષિત, મૈત્રીપૂર્ણ આરોગ્ય માર્ગદર્શન અને આગામી પગલાં માટે સપોર્ટ મેળવો.',
    whyAarogyam: 'શા માટે આરોગ્યમ',
    voiceFirstSupport: 'વોઇસ-ફર્સ્ટ સપોર્ટ જે શાંત, ઉપયોગી અને ઊંડો માનવીય લાગે છે.',
    dignifiedGuidance: 'આરોગ્ય સહાયતા માટે.',
    readyToBegin: 'શરૂ કરવા તૈયાર છો?',
    readyToExperience: 'AI-સંચાલિત હેલ્થકેરનો અનુભવ કરવા તૈયાર છો?',
    meetCompanion: 'વિચારશીલ સંભાળ માટે રચાયેલ શાંત, બુદ્ધિશાળી વોઇસ સાથીદારને મળો.',
    startTalking: 'વાત શરૂ કરો',
    home: 'આદિ',
    features: 'સુવિધાઓ',
    howItWorksNav: 'તે કેવી રીતે કામ કરે છે',
    about: 'વિશે',
    contact: 'સંપર્ક',
    signIn: 'સાઇન ઇન',
    getStarted: 'શરૂ કરો',
    dashboard: 'ડેશબોર્ડ',
    logout: 'લૉગઆઉટ',
  },
  'ಕನ್ನಡ': {
    premiumAi: 'ಭಾರತಕ್ಕಾಗಿ ವಿನ್ಯಾಸಗೊಳಿಸಲಾದ ಪ್ರೀಮಿಯಂ AI ಆರೋಗ್ಯ ಸೇವೆ',
    titlePart1: 'ಆರೋಗ್ಯ ಸೇವೆ ನಿಮ್ಮ ಮಾತು ಕೇಳುತ್ತದೆ.',
    titlePart2: 'ಕಾಳಜಿ ವಹಿಸುವ ಮಾರ್ಗದರ್ಶನ.',
    subtitle: 'ಭಾರತಕ್ಕಾಗಿ ನಿಮ್ಮ AI ಧ್ವನಿ ಆರೋಗ್ಯ ಸಂಗಾತಿ.',
    description: 'ಆರೋಗ್ಯಮ್ ಒಂದು AI-ಚಾಲಿತ ಬಹುಭಾಷಾ ಧ್ವನಿ ಆರೋಗ್ಯ ಸಂಗಾತಿಯಾಗಿದೆ.',
    listening: 'ಕೇಳಿಸಿಕೊಳ್ಳುತ್ತಿದೆ...',
    userQuote: '“ನನಗೆ ನಿನ್ನೆಯಿಂದ ಜ್ವರ ಬಂದಿದೆ.”',
    aarogyamResponse: '“ನಿಮ್ಮ ರೋಗಲಕ್ಷಣಗಳನ್ನು ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲು ಮತ್ತು ಸುರಕ್ಷಿತ ಮುಂದಿನ ಕ್ರಮಗಳನ್ನು ಸೂಚಿಸಲು ನಾನು ಸಹಾಯ ಮಾಡಬಲ್ಲೆ.”',
    talkToAarogyam: 'ಆರೋಗ್ಯಮ್ ಜೊತೆ ಮಾತನಾಡಿ',
    learnMore: 'ಇನ್ನಷ್ಟು ತಿಳಿಯಿರಿ',
    privacyFirst: 'ಗೌಪ್ಯತೆ ಮೊದಲು',
    privacyDesc: 'ಪ್ರತಿ ಹಂತದಲ್ಲೂ ಶಾಂತ ಮತ್ತು ವಿಶ್ವಾಸಾರ್ಹ ಸಂವಹನಗಳೊಂದಿಗೆ.',
    builtForBharat: 'ಭಾರತಕ್ಕಾಗಿ ನಿರ್ಮಿಸಲಾಗಿದೆ',
    builtDesc: 'ಸ್ಥಳೀಯ, ಗೌರವಯುತ ಮತ್ತು ಒಳಗೊಳ್ಳುವಂತೆ ಅನಿಸಲು ವಿನ್ಯಾಸಗೊಳಿಸಲಾದ ಬಹುಭಾಷಾ ಬೆಂಬಲ.',
    voiceFirst: 'ಧ್ವನಿ ಮೊದಲು',
    voiceDesc: 'ಧ್ವನಿ ಅನುಭವ.',
    realTimeAi: 'ನೈಜ-ಸಮಯದ AI',
    realTimeDesc: 'ತಕ್ಷಣ ಪ್ರತಿಕ್ರಿಯಿಸುವ ಮಾರ್ಗದರ್ಶನ.',
    coreCapabilities: 'ಪ್ರಮುಖ ಸಾಮರ್ಥ್ಯಗಳು',
    premiumLayer: 'ಸುಲಭ ಆರೈಕೆಗಾಗಿ ಪ್ರೀಮಿಯಂ ಇಂಟೆಲಿಜೆನ್ಸ್ ಲೇಯರ್',
    premiumLayerDesc: 'ಪ್ರತಿ ಸಂವಹನವೂ ಸುಲಭವಾಗಿ ಅನಿಸುವಂತೆ ರೂಪಿಸಲಾಗಿದೆ.',
    howItWorks: 'ಇದು ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ',
    threeSimpleSteps: 'ಮೂರು ಸರಳ ಹಂತಗಳು',
    threeSimpleStepsDesc: 'ಧ್ವನಿ ಮಾರ್ಗದರ್ಶನ.',
    speakNaturally: 'ಸಹಜವಾಗಿ ಮಾತನಾಡಿ',
    speakNaturallyDesc: 'ಸರಳ ಧ್ವನಿ ಪ್ರಾಂಪ್ಟ್‌ನೊಂದಿಗೆ ಪ್ರಾರಂಭಿಸಿ.',
    aiUnderstands: 'AI ಅರ್ಥಮಾಡಿಕೊಳ್ಳುತ್ತದೆ',
    aiUnderstandsDesc: 'ಆರೋಗ್ಯಮ್ ಕೇಳಿಸಿಕೊಳ್ಳುತ್ತದೆ.',
    getGuidance: 'ಸಹಾಯಕ ಮಾರ್ಗದರ್ಶನ ಪಡೆಯಿರಿ',
    getGuidanceDesc: 'ಮುಂದಿನ ಹಂತದ ಬೆಂಬಲ ಪಡೆಯಿರಿ.',
    whyAarogyam: 'ಏಕೆ ಆರೋಗ್ಯಮ್',
    voiceFirstSupport: 'ಧ್ವನಿ-ಪ್ರಥಮ ಬೆಂಬಲ.',
    dignifiedGuidance: 'ಗೌರವಯುತ ಮಾರ್ಗದರ್ಶನ.',
    readyToBegin: 'ಪ್ರಾರಂಭಿಸಲು ಸಿದ್ಧರಿದ್ದೀರಾ?',
    readyToExperience: 'ಆರೋಗ್ಯ ಸೇವೆಯನ್ನು ಅನುಭವಿಸಲು ಸಿದ್ಧರಿದ್ದೀರಾ?',
    meetCompanion: 'ಬುದ್ಧಿವಂತ ಧ್ವನಿ ಸಂಗಾತಿಯನ್ನು ಭೇಟಿ ಮಾಡಿ.',
    startTalking: 'ಮಾತನಾಡಲು ಪ್ರಾರಂಭಿಸಿ',
    home: 'ಮುಖಪುಟ',
    features: 'ವೈಶಿಷ್ಟ್ಯಗಳು',
    howItWorksNav: 'ಇದು ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ',
    about: 'ಬಗ್ಗೆ',
    contact: 'ಸಂಪರ್ಕಿಸಿ',
    signIn: 'ಸೈನ್ ಇನ್',
    getStarted: 'ಪ್ರಾರಂಭಿಸಿ',
    dashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    logout: 'ಲಾಗ್‌ಔಟ್',
  },
  'മലയാളം': {
    premiumAi: 'ഭാരതത്തിനായി രൂപകൽപ്പന ചെയ്ത പ്രീമിയം AI ആരോഗ്യ പരിചരണം',
    titlePart1: 'കേൾക്കുന്ന ആരോഗ്യ പരിചരണം.',
    titlePart2: 'കരുതലോടെയുള്ള മാർഗ്ഗനിർദ്ദേശം.',
    subtitle: 'ഭാരതത്തിനായുള്ള നിങ്ങളുടെ AI വോയ്‌സ് കൂട്ട്.',
    description: 'ഒരു AI-അധിഷ്ഠിത ബഹുഭാഷാ വോയ്‌സ് ആരോഗ്യ കൂട്ടാളിയാണ് ആരോഗ്യമ്.',
    listening: 'ശ്രദ്ധിക്കുന്നു...',
    userQuote: '“എനിക്ക് ഇന്നലെ മുതൽ പനിയുണ്ട്.”',
    aarogyamResponse: '“സുരക്ഷിതമായ അടുത്ത ഘട്ടങ്ങൾ നിർദ്ദേശിക്കാൻ എനിക്ക് കഴിയും.”',
    talkToAarogyam: 'ആരോഗ്യമിനോട് സംസാരിക്കുക',
    learnMore: 'കൂടുതൽ അറിയുക',
    privacyFirst: 'സ്വകാര്യത ആദ്യം',
    privacyDesc: 'സ്വകാര്യമായ ഇടപെടലുകളോടെ രൂപകൽപ്പനയിൽ സുരക്ഷിതം.',
    builtForBharat: 'ഭാരതത്തിനായി നിർമ്മിച്ചത്',
    builtDesc: 'പ്രാദേശികവും മാന്യവുമായ പിന്തുണ.',
    voiceFirst: 'വോയ്‌സ് ആദ്യം',
    voiceDesc: 'വോയ്‌സ് അനുഭവം.',
    realTimeAi: 'തത്സമയ AI',
    realTimeDesc: 'തൽക്ഷണ പ്രതികരണ മാർഗ്ഗനിർദ്ദേശം.',
    coreCapabilities: 'പ്രധാന കഴിവുകൾ',
    premiumLayer: 'ഒരു പ്രീമിയം ഇന്റലിജൻസ് ലെയർ',
    premiumLayerDesc: 'അങ്ങേയറ്റം മാനുഷികമായി രൂപകൽപ്പന ചെയ്‌തിരിക്കുന്നു.',
    howItWorks: 'ഇത് എങ്ങനെ പ്രവർത്തിക്കുന്നു',
    threeSimpleSteps: 'മൂന്ന് ലളിതമായ ഘട്ടങ്ങൾ',
    threeSimpleStepsDesc: 'ആരോഗ്യ മാർഗ്ഗനിർദ്ദേശം.',
    speakNaturally: 'സ്വാഭാവികമായി സംസാരിക്കുക',
    speakNaturallyDesc: 'ലളിതമായ വോയ്‌സ് പ്രോംപ്റ്റ് ഉപയോഗിച്ച് ആരംഭിക്കുക.',
    aiUnderstands: 'AI മനസ്സിലാക്കുന്നു',
    aiUnderstandsDesc: 'ആരോഗ്യമ് ശ്രദ്ധിക്കുന്നു.',
    getGuidance: 'സഹായകരമായ മാർഗ്ഗനിർദ്ദേശം നേടുക',
    getGuidanceDesc: 'അടുത്ത ഘട്ട പിന്തുണ നേടുക.',
    whyAarogyam: 'എന്തുകൊണ്ട് ആരോഗ്യമ്',
    voiceFirstSupport: 'വോയ്‌സ്-ഫസ്റ്റ് പിന്തുണ.',
    dignifiedGuidance: 'സഹായകരമായ ആദ്യ പടിയോ ആഗ്രഹിക്കുന്നവർക്കായി രൂപകൽപ്പന ചെയ്തത്.',
    readyToBegin: 'ആരംഭിക്കാൻ തയ്യാറാണോ?',
    readyToExperience: 'ആരോഗ്യ പരിചരണം അനുഭവിക്കാൻ തയ്യാറാണോ?',
    meetCompanion: 'ബുദ്ധിപരവുമായ വോയ്‌സ് കൂട്ടാളിയെ കണ്ടുമുട്ടുക.',
    startTalking: 'സംസാരിക്കാൻ ആരംഭിക്കുക',
    home: 'ഹോം',
    features: 'സവിശേഷതകൾ',
    howItWorksNav: 'പ്രവർത്തന രീതി',
    about: 'കുറിച്ച്',
    contact: 'ബന്ധപ്പെടുക',
    signIn: 'ലോഗിн',
    getStarted: 'ആരംഭിക്കുക',
    dashboard: 'ഡാഷ്‌ബോർഡ്',
    logout: 'ലോഗ്ഔട്ട്',
  },
  'मराठी': {
    premiumAi: 'भारतासाठी डिझाइन केलेली प्रीमियम एआय आरोग्य सेवा',
    titlePart1: 'आरोग्य सेवा जी ऐकते।',
    titlePart2: 'मार्गदर्शन जे काळजी घेते।',
    subtitle: 'भारतासाठी तुमचा एआय व्हॉईस हेल्थ साथीदार.',
    description: 'आरोग्यम हा एक एआय-संचालित व्हॉईस हेल्थ साथीदार आहे.',
    listening: 'ऐकत आहे...',
    userQuote: '“मला कालपासून ताप आहे.”',
    aarogyamResponse: '“मी तुमची लक्षणे समजून घेण्यास मदत करू शकतो.”',
    talkToAarogyam: 'आरोग्यमशी बोला',
    learnMore: 'अधिक जाणून घ्या',
    privacyFirst: 'गोपनीयता प्रथम',
    privacyDesc: 'शांत आणि विश्वासार्ह संभाषणासह.',
    builtForBharat: 'भारतासाठी निर्मित',
    builtDesc: 'सर्वसमावेशक वाटण्यासाठी डिझाइन केलेले बहुभाषिक समर्थन.',
    voiceFirst: 'व्हॉईस प्रथम',
    voiceDesc: 'व्हॉईस अनुभव.',
    realTimeAi: 'रीअल-टाइम एआय',
    realTimeDesc: 'त्वरित प्रतिसाद देणारे मार्गदर्शन.',
    coreCapabilities: 'मुख्य क्षमता',
    premiumLayer: 'एक प्रीमियम इंटेलिजन्स स्तर',
    premiumLayerDesc: 'प्रत्येक संवाद सहज वाटावा.',
    howItWorks: 'हे कसे काम करते',
    threeSimpleSteps: 'तीन सोप्या पायऱ्या',
    threeSimpleStepsDesc: 'उपयुक्त आरोग्य मार्गदर्शन मिळवा.',
    speakNaturally: 'सहजतेने बोला',
    speakNaturallyDesc: 'साध्या व्हॉईस प्रॉम्प्टसह प्रारंभ करा.',
    aiUnderstands: 'एआय समजते',
    aiUnderstandsDesc: 'आरोग्यम ऐकतो.',
    getGuidance: 'मदतगार मार्गदर्शन मिळवा',
    getGuidanceDesc: 'पुढील पावले उचलण्यास मदत मिळवा.',
    whyAarogyam: 'आरोग्यम का',
    voiceFirstSupport: 'व्हॉईस-फर्स्ट सपोर्ट.',
    dignifiedGuidance: 'दररोजच्या आरोग्यासाठी मदत.',
    readyToBegin: 'सुरू करण्यास तयार आहात?',
    readyToExperience: 'आरोग्य सेवेचा अनुभव घेण्यास तयार आहात?',
    meetCompanion: 'बुद्धिमान व्हॉईस साथीदाराला भेटा.',
    startTalking: 'बोलणे सुरू करा',
    home: 'होम',
    features: 'वैशिष्ट्ये',
    howItWorksNav: 'हे कसे काम करते',
    about: 'बद्दल',
    contact: 'संपर्क',
    signIn: 'साइन इन',
    getStarted: 'सुरू करा',
    dashboard: 'डॅशबोर्ड',
    logout: 'लॉगआउट',
  },
  'ਪੰਜਾਬੀ': {
    premiumAi: 'ਭਾਰਤ ਲਈ ਡਿਜ਼ਾਈਨ ਕੀਤੀ ਗਈ ਪ੍ਰੀਮੀਅਮ ਏਆਈ ਸਿਹਤ ਸੇਵਾ',
    titlePart1: 'ਸਿਹਤ ਸੇਵਾ ਜੋ ਸੁਣਦੀ ਹੈ।',
    titlePart2: 'ਮਾਰਗਦਰਸ਼ਨ ਜੋ ਦੇਖਭਾਲ ਕਰਦਾ ਹੈ।',
    subtitle: 'ਭਾਰਤ ਲਈ ਤੁਹਾਡਾ ਏਆਈ ਸਾਥੀ।',
    description: 'ਆਰੋਗਿਆਮ ਇੱਕ ਵੌਇਸ ਹੈਲਥ ਸਾਥੀ ਹੈ।',
    listening: 'ਸੁਣ ਰਿਹਾ ਹੈ...',
    userQuote: '“ਮੈਨੂੰ ਕੱਲ੍ਹ ਤੋਂ ਬੁਖਾਰ ਹੈ।”',
    aarogyamResponse: '“ਮੈਂ ਤੁਹਾਡੇ ਲੱਛਣਾਂ ਨੂੰ ਸਮਝਣ ਵਿੱਚ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ।”',
    talkToAarogyam: 'ਆਰੋਗਿਆਮ ਨਾਲ ਗੱਲ ਕਰੋ',
    learnMore: 'ਹੋਰ ਜਾਣੋ',
    privacyFirst: 'ਗੋਪਨੀਯਤਾ ਪਹਿਲਾਂ',
    privacyDesc: 'ਹਰ ਕਦਮ ਤੇ ਭਰੋਸੇਮੰਦ ਗੱਲਬਾਤ ਨਾਲ।',
    builtForBharat: 'ਭਾਰਤ ਲਈ ਬਣਾਇਆ',
    builtDesc: 'ਬਹੁਭਾਸ਼ੀ ਸਮਰਥਨ।',
    voiceFirst: 'ਆਵਾਜ਼ ਪਹਿਲਾਂ',
    voiceDesc: 'ਨਿਰਵਿਘਨ ਆਵਾਜ਼ ਦਾ ਅਨੁਭਵ।',
    realTimeAi: 'ਰੀਅਲ-ਟਾਈਮ ਏਆਈ',
    realTimeDesc: 'ਤੁਰੰਤ ਪ੍ਰਤੀਕਿਰਿਆ ਦੇਣ ਵਾਲਾ ਮਾਰਗਦਰਸ਼ਨ।',
    coreCapabilities: 'ਮੁੱਖ ਸਮਰੱਥਾਵਾਂ',
    premiumLayer: 'ਪ੍ਰੀਮੀਅਮ ਇੰਟੈਲੀਜੈਂਸ ਪਰਤ',
    premiumLayerDesc: 'ਮਨੁੱਖੀ ਬਣਾਉਣ ਲਈ ਤਿਆਰ ਕੀਤਾ ਗਿਆ ਹੈ।',
    howItWorks: 'ਇਹ ਕਿਵੇਂ ਕੰਮ ਕਰਦਾ ਹੈ',
    threeSimpleSteps: 'ਤਿੰਨ ਸਧਾਰਨ ਕਦਮ',
    threeSimpleStepsDesc: 'ਲਾਭਦਾਇਕ ਸਿਹਤ ਮਾਰਗਦਰਸ਼ਨ।',
    speakNaturally: 'ਕੁਦਰਤੀ ਤੌਰ ਤੇ ਬੋਲੋ',
    speakNaturallyDesc: 'ਸਧਾਰਨ ਵੌਇਸ ਪ੍ਰੋਂਪਟ ਨਾਲ ਸ਼ੁਰੂ ਕਰੋ।',
    aiUnderstands: 'ਏਆਈ ਸਮਝਦਾ ਹੈ',
    aiUnderstandsDesc: 'ਆਰੋਗਿਆਮ ਸੁਣਦਾ ਹੈ।',
    getGuidance: 'ਮਦਦਗਾਰ ਮਾਰਗਦਰਸ਼ਨ ਪ੍ਰਾਪਤ ਕਰੋ',
    getGuidanceDesc: 'ਅਗਲੇ ਕਦਮ ਦੀ ਸਹਾਇਤਾ ਪ੍ਰਾਪਤ ਕਰੋ।',
    whyAarogyam: 'ਆਰੋਗਿਆਮ ਕਿਉਂ',
    voiceFirstSupport: 'ਵੌਇਸ-ਫਸਟ ਸਹਾਇਤਾ।',
    dignifiedGuidance: 'ਸਤਿਕਾਰਯੋਗ ਮਾਰਗਦਰਸ਼ਨ।',
    readyToBegin: 'ਸ਼ੁਰੂ ਕਰਨ ਲਈ ਤਿਆਰ ਹੋ?',
    readyToExperience: 'ਸਿਹਤ ਸੇਵਾ ਦਾ ਅਨੁਭਵ ਕਰਨ ਲਈ ਤਿਆਰ ਹੋ?',
    meetCompanion: 'ਬੁੱਧੀਮਾਨ ਵੌਇਸ ਸਾਥੀ ਨੂੰ ਮਿਲੋ।',
    startTalking: 'ਗੱਲ ਕਰਨੀ ਸ਼ੁਰੂ ਕਰੋ',
    home: 'ਹੋਮ',
    features: 'ਵਿਸ਼ੇਸ਼ਤਾਵਾਂ',
    howItWorksNav: 'ਇਹ ਕਿਵੇਂ ਕੰਮ ਕਰਦਾ ਹੈ',
    about: 'ਬਾਰੇ',
    contact: 'ਸੰਪਰਕ',
    signIn: 'ਸਾਈਨ ਇਨ',
    getStarted: 'ਸ਼ੁਰੂ ਕਰੋ',
    dashboard: 'ਡੈਸ਼ਬੋਰਡ',
    logout: 'ਲੌਗਆਊਟ',
  },
  'ଓଡ଼ିଆ': {
    premiumAi: 'ଭାରତ ପାଇଁ ଡିଜାଇନ କରାଯାଇଥିବା ପ୍ରିମିୟମ AI ସ୍ୱାସ୍ଥ୍ୟ ସେବା',
    titlePart1: 'ସ୍ୱାସ୍ଥ୍ୟ ସେବା ଯାହା ଶୁଣେ।',
    titlePart2: 'ମାର୍ଗଦର୍ଶନ ଯାହା ଯତ୍ନ ନିଏ।',
    subtitle: 'ଭାରତ ପାଇଁ ଆପଣଙ୍କର AI ସ୍ୱାସ୍ଥ୍ୟ ସାଥୀ।',
    description: 'ଆରୋଗ୍ୟମ ହେଉଛି ଏକ AI- ଚାଳିତ ସ୍ୱାସ୍ଥ୍ୟ ସାଥୀ।',
    listening: 'ଶୁଣୁଛି...',
    userQuote: '“ମତେ କାଲିଠାରୁ ଜ୍ୱର ହୋଇଛି।”',
    aarogyamResponse: '“ମୁଁ ଆପଣଙ୍କର ଲକ୍ଷଣ ବୁଝିବାରେ ସାହାଯ୍ୟ କରିପାରିବି।”',
    talkToAarogyam: 'ଆରୋଗ୍ୟମ ସହ କଥା ହୁଅନ୍ତୁ',
    learnMore: 'ଅଧିକ ଜାଣନ୍ତୁ',
    privacyFirst: 'ଗୋପନୀୟତା ପ୍ରଥମେ',
    privacyDesc: 'ପ୍ରତି ପଦକ୍ଷେପରେ ଶାନ୍ତ ଆଲୋଚନା।',
    builtForBharat: 'ଭାରତ ପାଇଁ ନିର୍ମିତ',
    builtDesc: 'ସ୍ଥାନୀୟ ବହୁଭାଷୀ ସମର୍ଥନ।',
    voiceFirst: 'ସ୍ୱର ପ୍ରଥମେ',
    voiceDesc: 'ସ୍ୱର ଅନୁଭବ।',
    realTimeAi: 'ତତ୍କାଳ AI',
    realTimeDesc: 'ତୁରନ୍ତ ପ୍ରତିକ୍ରିୟା ଦେଉଥିବା ମାର୍ଗଦର୍ଶନ।',
    coreCapabilities: 'ମୁଖ୍ୟ ଦକ୍ଷତା',
    premiumLayer: 'ପ୍ରିମିୟମ ବୁଦ୍ଧିମତା ସ୍ତର',
    premiumLayerDesc: 'ମାନବୀୟ କରିବାକୁ ପ୍ରସ୍ତୁତ।',
    howItWorks: 'ଏହା କିପରି କାମ କରେ',
    threeSimpleSteps: 'ତିନୋଟି ସରଳ ପଦକ୍ଷେਪ',
    threeSimpleStepsDesc: 'ସ୍ୱାସ୍ଥ୍ୟ ମାର୍ଗଦର୍ଶନ।',
    speakNaturally: 'ସହଜରେ କୁହନ୍ତୁ',
    speakNaturallyDesc: 'ସାଧାରଣ ସ୍ୱର ପ୍ରମ୍ପ୍ଟ ସହ ଆରମ୍ଭ କରନ୍ତୁ।',
    aiUnderstands: 'AI ବୁଝିପାରେ',
    aiUnderstandsDesc: 'ଆରୋଗ୍ୟମ ଶୁଣେ।',
    getGuidance: 'ସହାୟକ ମାର୍ଗଦର୍ଶନ ପାଆନ୍ତୁ',
    getGuidanceDesc: 'ପରବର୍ତ୍ତୀ ପଦକ୍ଷେପ ସହାୟତା ପାଆନ୍ତୁ।',
    whyAarogyam: 'କାହିଁକି ଆରୋଗ୍ୟମ',
    voiceFirstSupport: 'ସ୍ୱର-ପ୍ରଥମ ସହାୟତା।',
    dignifiedGuidance: 'ସମ୍ମାନଜନକ ମାର୍ଗଦର୍ଶନ।',
    readyToBegin: 'ଆରମ୍ଭ କରିବାକୁ ପ୍ରସ୍ତୁତ କି?',
    readyToExperience: 'ସ୍ୱାସ୍ଥ୍ୟସେବା ଅନུଭવ କରିବାକୁ ପ୍ରସ୍તୁତ କି?',
    meetCompanion: 'ବୁଦ୍ଧିମାନ ସ୍ୱର ସାଥୀଙ୍କୁ ଭେଟନ୍ତୁ।',
    startTalking: 'କଥା ହେବା ଆରମ୍ଭ କରନ୍ତୁ',
    home: 'ମୂଳପୃଷ୍ଠା',
    features: 'ବୈଶିଷ୍ଟ୍ୟ',
    howItWorksNav: 'କାର୍ଯ୍ୟକାରିତା',
    about: 'ବିଷୟରେ',
    contact: 'ଯୋଗାଯୋଗ',
    signIn: 'ସାଇନ୍ ଇନ୍',
    getStarted: 'ଆରମ୍ଭ କରନ୍ତୁ',
    dashboard: 'ଡ୍ୟାସବୋର୍ଡ',
    logout: 'ଲଗଆଉଟ',
  },
  'অসমীয়া': {
    premiumAi: 'ভাৰতৰ বাবে ডিজাইন কৰা প্ৰিমিয়াম এআই স্বাস্থ্যসেৱা',
    titlePart1: 'স্বাস্থ্যসেৱা যিয়ে শুনে।',
    titlePart2: 'নিৰ্দেশনা যিয়ে যত্ন লয়।',
    subtitle: 'ভাৰতৰ বাবে কণ্ঠ সহযোগী।',
    description: 'আৰোগ্যম হৈছে এটা এআই-চালিত কণ্ঠ স্বাস্থ্য সহযোগী।',
    listening: 'শুনি থকা হৈছে...',
    userQuote: '“মোৰ কালিৰ পৰা জ্বৰ হৈছে।”',
    aarogyamResponse: '“মই আপোনাৰ লক্ষণসমূহ বুজাত সহায় কৰিব পাৰোঁ।”',
    talkToAarogyam: 'আৰোগ্যমৰ সৈته কথা পাতক',
    learnMore: 'অধিক জানক',
    privacyFirst: 'গোপনীয়তা প্ৰথম',
    privacyDesc: 'শান্ত আৰু বিশ্বাসযোগ্য বাৰ্তালাপৰ সৈতে।',
    builtForBharat: 'ভাৰতৰ বাবে নিৰ্মিত',
    builtDesc: 'স্থানীয় বহুভাষিক সমৰ্থন।',
    voiceFirst: 'কণ্ঠ প্ৰথম',
    voiceDesc: 'কণ্ঠ অভিজ্ঞতা।',
    realTimeAi: 'ৰিয়েল-টাইম এআই',
    realTimeDesc: 'তত্কাল সঁহাৰি দিয়া নিৰ্দেশনা।',
    coreCapabilities: 'মূল ক্ষমতা',
    premiumLayer: 'প্ৰিমিয়াম বুদ্ধিমত্তা স্তৰ',
    premiumLayerDesc: 'মানৱীয় কৰিবলৈ তৈয়াৰ কৰা হৈছে।',
    howItWorks: 'কেনেকৈ কাম কৰে',
    threeSimpleSteps: 'তিনিটা সৰল পদক্ষেপ',
    threeSimpleStepsDesc: 'উপযোগী স্বাস্থ্য নিৰ্দেশনা।',
    speakNaturally: 'স্বাভাৱিকভাৱে কওক',
    speakNaturallyDesc: 'সাধাৰণ কণ্ঠ প্ৰম্পটৰ সৈতে আৰম্ভ কৰক।',
    aiUnderstands: 'এআইয়ে বুজি পায়',
    aiUnderstandsDesc: 'আৰোগ্যমে শুনে।',
    getGuidance: 'সহায়ক নিৰ্দেশনা লাভ কৰক',
    getGuidanceDesc: 'পৰৱৰ্তী পদক্ষেপৰ সমৰ্থন লাভ কৰক।',
    whyAarogyam: 'কিয় আৰোগ্যম',
    voiceFirstSupport: 'কণ্ঠ-প্ৰথম সমৰ্থন।',
    dignifiedGuidance: 'সন্মানজনক নিৰ্দেশনা।',
    readyToBegin: 'আৰম্ভ কৰিবলৈ সাজুনে?',
    readyToExperience: 'স্বাস্থ্যসেৱাৰ অভিজ্ঞতা ল’বলৈ সাজুনে?',
    meetCompanion: 'বুদ্ধিমান কণ্ঠ সহযোগীৰ সৈতে সাক্ষাৎ কৰক।',
    startTalking: 'কথা কোৱা আৰম্ভ কৰক',
    home: 'হোম',
    features: 'সুবিধাসমূহ',
    howItWorksNav: 'কেনেকৈ কাম কৰੇ',
    about: 'সম্পৰ্কে',
    contact: 'যোগাযোগ',
    signIn: 'ছাইন ইন',
    getStarted: 'আৰম্ভ কৰক',
    dashboard: 'ড্যাশবৰ্ড',
    logout: 'লগআউট',
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('English');

  useEffect(() => {
    const storedLang = localStorage.getItem('aarogyam_language') as Language;
    if (storedLang && translations[storedLang]) {
      setLanguageState(storedLang);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    if (translations[lang]) {
      setLanguageState(lang);
      localStorage.setItem('aarogyam_language', lang);
    }
  };

  const t = (key: string): string => {
    const langDict = translations[language] || translations['English'];
    return langDict[key] || translations['English'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// ==========================================
// 3. COMBINED PROVIDERS WRAPPER
// ==========================================

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </LanguageProvider>
  );
}
