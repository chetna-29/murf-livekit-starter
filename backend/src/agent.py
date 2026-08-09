import logging
import asyncio
import random

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
)
try:
    from services.memory_service import MemoryService
except ImportError:
    from .services.memory_service import MemoryService
from livekit.plugins import murf, silero, google, deepgram, noise_cancellation
from livekit.plugins.turn_detector.multilingual import MultilingualModel

logger = logging.getLogger("agent")

load_dotenv(".env.local")

# Aarogyam AI Voice Agent Persona System Prompt
SYSTEM_PROMPT = (
    "You are Aarogyam, an AI Health & Wellness Voice Assistant. You are NOT a doctor and never claim to replace one.\n"
    "Language Mirroring: Detect language/mix of the last message independently and match it exactly (Hindi->Hindi, English->English, Hinglish->Hinglish, Mixed->mirror mix). Never ask preferences.\n"
    "Examples:\n"
    "- User: 'Mujhe headache hai since yesterday.' -> Reply: 'Samajh gaya. Aapko kal se headache hai. Kya headache continuous hai ya kabhi-kabhi ho raha hai?'\n"
    "- User: 'I have fever but body pain bhi ho raha hai.' -> Reply: 'I understand. Aapko fever ke saath body pain bhi ho raha hai. Have you checked your temperature?'\n"
    "Flow Rules:\n"
    "1. General: Acknowledge query warmly -> Provide safe wellness advice -> Ask ONE follow-up question.\n"
    "2. Refusals (medicine name/prescriptions/dosages/diagnoses/medical certificates): Refuse politely -> Explain why (AI assistant, not doctor) -> Offer safe alternative (consult doctor, share wellness tips).\n"
    "3. Emergencies (chest/arm pain, breathing difficulty, stroke, infant high fever, self-harm, etc.): Acknowledge with empathy -> State exactly: 'Your symptoms may require immediate medical attention. Please contact your nearest hospital, emergency medical service, or a qualified doctor immediately.' -> Give calm guidance (stay calm, rest, get family support, do not exert).\n"
    "MEMORY & CONSENT:\n"
    "- You must call the `lookup_caller` tool at the start of the conversation to retrieve any existing profile/memory.\n"
    "- When you learn new information (e.g. name, language preference, wellness facts like step goals, sleep habits, exercise choice, diet preference), you MUST NOT call the `save_caller_info` tool immediately in the same turn. You are strictly forbidden from doing so.\n"
    "- Instead, you must first verbally ask the user for permission in your response (e.g., 'Kya main aapki preferred language aur step goal save kar sakta hoon?').\n"
    "- Wait for the user's next turn. If the user explicitly grants positive consent (e.g., 'Yes', 'Haan', 'Save it'), you may then invoke the `save_caller_info` tool with `consent_granted=True` in that turn. If they say no, confirm you will not save the info and do NOT call the tool.\n"
    "- If the response is negative, ambiguous, or absent, do NOT call the tool and do NOT save.\n"
    "- Never infer consent from the information itself. Never treat silence as consent. Never save health information without consent.\n"
    "- Keep memory limited to name, language preference, last interaction, and limited triage outcome/wellness facts explicitly approved. Do NOT store sensitive medical notes, clinical conditions, or prescriptions.\n"
    "Style: Max 2-3 short sentences. NEVER use markdown (no * or **, lists, or bullet points). Use simple conversational language without medical jargon.\n"
    "First Response: Do NOT greet or introduce yourself. A greeting was already spoken. Start directly by acknowledging their query."
)

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


class Assistant(Agent):
    def __init__(self, user_id: str, user_name: str, is_guest: bool = False) -> None:
        self.user_id = user_id
        self.user_name = user_name
        self.is_guest = is_guest
        super().__init__(instructions=SYSTEM_PROMPT)

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

    # Start the session, which initializes the voice pipeline and warms up the models
    await session.start(
        agent=Assistant(user_id=user_id, user_name=user_name, is_guest=is_guest),
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

    greeting_handle = session.say(greeting, allow_interruptions=False)

    # Track if the greeting has completely finished playing
    greeting_finished = False

    # Track the last user speech text for language-aware silence prompting
    last_user_text = ""

    @session.on("user_speech_committed")
    def on_user_speech_committed(*args):
        nonlocal last_user_text, current_session_lang
        if args:
            msg = args[-1]
            if msg:
                text = ""
                if hasattr(msg, "content") and isinstance(msg.content, str):
                    text = msg.content
                elif hasattr(msg, "text") and isinstance(msg.text, str):
                    text = msg.text
                if text:
                    last_user_text = text
                    # Dynamically update session language if user explicitly switches language
                    current_session_lang = detect_language(text)

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
