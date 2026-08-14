import pytest
from livekit.agents import AgentSession, inference, llm

from agent import Assistant, ClinicAppointmentSpecialist


def _llm() -> llm.LLM:
    return inference.LLM(model="openai/gpt-4.1-mini")


@pytest.mark.asyncio
async def test_normal_query_no_handoff() -> None:
    """Ensure a wellness question does not trigger the handoff tool."""
    async with (
        _llm() as llm_client,
        AgentSession(llm=llm_client) as session,
    ):
        await session.start(Assistant())

        # Ask a wellness question
        result = await session.run(user_input="What are some tips for a healthy diet?")

        # The agent should respond directly without calling the handoff tool
        await (
            result.expect.next_event(type="message")
            .judge(
                llm_client,
                intent="""
                Provides friendly health and wellness advice or suggestions.
                Does NOT mention connecting to a specialist or handing off the call.
                """,
            )
        )
        # Ensure the session has no more active events (no handoff was triggered)
        result.expect.no_more_events()
        assert isinstance(session.current_agent, Assistant)


@pytest.mark.asyncio
async def test_clinic_query_triggers_handoff() -> None:
    """Ensure a clinic search query triggers the handoff tool."""
    async with (
        _llm() as llm_client,
        AgentSession(llm=llm_client) as session,
    ):
        await session.start(Assistant())

        # Ask to find a clinic
        result = await session.run(user_input="Can you help me find a hospital near me in Jaipur?")

        # The tool handoff_to_clinic_specialist should be called
        # Followed by the verbal handoff announcement
        await (
            result.expect.next_event(type="message")
            .judge(
                llm_client,
                intent="""
                Announces that they are connecting the user with the clinic or appointment specialist.
                """,
            )
        )

        # After the reply, session.current_agent should have transitioned to ClinicAppointmentSpecialist
        assert isinstance(session.current_agent, ClinicAppointmentSpecialist)


@pytest.mark.asyncio
async def test_specialist_remains_active_for_details_and_ratings() -> None:
    """Ensure that the specialist remains active when asked about details or ratings,
    and only hands back when asked a general wellness question.
    """
    async with (
        _llm() as llm_client,
        AgentSession(llm=llm_client) as session,
    ):
        # Start directly with the Clinic Specialist
        chat_ctx = llm.ChatContext()
        specialist = ClinicAppointmentSpecialist(chat_ctx=chat_ctx)
        await session.start(specialist)

        # 1. Ask about a specific hospital
        result = await session.run(user_input="Tell me about the City Hospital in Jaipur.")
        await (
            result.expect.next_event(type="message")
            .judge(
                llm_client,
                intent="""
                Responds regarding City Hospital or states it is searching.
                Does NOT try to hand back or say it is connecting to main agent.
                """,
            )
        )
        assert isinstance(session.current_agent, ClinicAppointmentSpecialist)

        # 2. Ask about ratings/reviews (unsupported/unavailable data)
        result2 = await session.run(user_input="What is the rating or review of City Hospital?")
        await (
            result2.expect.next_event(type="message")
            .judge(
                llm_client,
                intent="""
                Honestly states that it does not have or cannot verify the rating/reviews of the hospital.
                Does NOT call the hand-back tool or hand back to the main agent.
                """,
            )
        )
        assert isinstance(session.current_agent, ClinicAppointmentSpecialist)

        # 3. Change to a completely general health question
        result3 = await session.run(user_input="What is a good exercise routine for weight loss?")
        await (
            result3.expect.next_event(type="message")
            .judge(
                llm_client,
                intent="""
                Announces that they are transferring the user back to Aarogyam.
                """,
            )
        )
        # Verify it successfully handed back to the main Assistant agent
        assert isinstance(session.current_agent, Assistant)
