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
)
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
    "Style: Max 2-3 short sentences. NEVER use markdown (no * or **, lists, or bullet points). Use simple conversational language without medical jargon.\n"
    "First Response: Do NOT greet or introduce yourself. A greeting was already spoken. Start directly by acknowledging their query."
)

GREETINGS = [
    "Namaste! Main Aarogyam hoon, aapka AI Health Assistant. Main general health guidance, healthy lifestyle tips aur common health-related questions mein aapki madad kar sakta hoon. Main doctor nahi hoon aur diagnosis ya prescription provide nahi karta. Batayiye, aaj main aapki kis tarah madad kar sakta hoon?",
    "Namaste! Aarogyam AI Health Companion mein aapka swagat hai. Main aapko health and wellness tips, healthy habits aur general medical queries par guidance de sakta hoon. Main koi professional doctor nahi hoon, isliye diagnosis ya medication nahi de sakta. Aaj main aapki kya madad karoon?",
    "Namaste! Main Aarogyam AI Assistant bol raha hoon. Yahan main aapki wellness, nutrition aur daily health habits se jude sawaalon mein madad karne ke liye hoon. Main professional medical advice ya prescription nahi deta hoon. Batayiye, aaj aap apne swasthya ke baare mein kya poochna chahenge?"
]


class Assistant(Agent):
    def __init__(self) -> None:
        super().__init__(instructions=SYSTEM_PROMPT)

    # To add tools, use the @function_tool decorator.
    # Here's an example that adds a simple weather tool.
    # You also have to add `from livekit.agents import function_tool, RunContext` to the top of this file
    # @function_tool
    # async def lookup_weather(self, context: RunContext, location: str):
    #     """Use this tool to look up current weather information in the given location.
    #
    #     If the location is not supported by the weather service, the tool will indicate this. You must tell the user the location's weather is unavailable.
    #
    #     Args:
    #         location: The location to look up weather information for (e.g. city name)
    #     """
    #
    #     logger.info(f"Looking up weather for {location}")
    #
    #     return "sunny with a temperature of 70 degrees."


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

    # Start the session, which initializes the voice pipeline and warms up the models
    await session.start(
        agent=Assistant(),
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

    # Join the room and connect to the user
    await ctx.connect()

    # Wait briefly for audio pipeline to stabilize, then greet the user (stabilization sleep reduced to 0.1s)
    await asyncio.sleep(0.1)
    greeting = random.choice(GREETINGS)
    greeting_handle = session.say(greeting, allow_interruptions=False)

    # Track if the greeting has completely finished playing
    greeting_finished = False

    silence_count = 0
    silence_timer_task = None

    async def run_silence_timer():
        nonlocal silence_count, silence_timer_task
        try:
            # 1st silence is 8 seconds
            if silence_count == 0:
                await asyncio.sleep(8.0)
                silence_count = 1
                logger.info("Silence detected. Prompting user.")
                session.say(
                    "Main yahin hoon. Jab aap ready hon, apna question pooch sakte hain.",
                    allow_interruptions=True
                )
                start_silence_timer()
            elif silence_count == 1:
                # 2nd silence is 10 seconds
                await asyncio.sleep(10.0)
                silence_count = 2
                logger.info("Silence detected twice. Saying goodbye and shutting down.")
                speech_handle = session.say(
                    "Lagta hai filhaal koi aur question nahi hai. Jab bhi zarurat ho, main yahin hoon. Apna khayal rakhiye.",
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
