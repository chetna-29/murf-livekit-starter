import asyncio
import os
import argparse
import sys
from dotenv import load_dotenv
from livekit import api

# Add local directory to path to ensure proper imports if needed
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load the local config
load_dotenv(".env.local")


async def trigger_call(phone_number: str, room_name: str | None = None):
    url = os.getenv("LIVEKIT_URL")
    api_key = os.getenv("LIVEKIT_API_KEY")
    api_secret = os.getenv("LIVEKIT_API_SECRET")

    if not url or not api_key or not api_secret:
        print(
            "Error: LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET must be configured."
        )
        return

    if not room_name:
        # Generate a unique room name based on phone number to avoid collisions
        # Strip any + to make a clean room name
        clean_phone = phone_number.replace("+", "").replace(" ", "").strip()
        room_name = f"outbound_call_{clean_phone}"

    # Use livekit.api client
    lk_api = api.LiveKitAPI(url=url, api_key=api_key, api_secret=api_secret)
    try:
        print(f"1. Dispatching agent 'my-agent' to room: {room_name}")
        # Dispatch the agent to the room
        await lk_api.agent_dispatch.create_dispatch(
            api.CreateAgentDispatchRequest(
                room=room_name,
                agent_name="my-agent",
                metadata=phone_number,  # Pass the phone number as metadata
            )
        )

        sip_trunk_id = os.getenv("LIVEKIT_SIP_TRUNK_ID")
        if sip_trunk_id:
            print(f"2. Initiating SIP call using Stored Trunk ID: {sip_trunk_id}")
            request = api.CreateSIPParticipantRequest(
                room_name=room_name,
                sip_call_to=phone_number,
                sip_trunk_id=sip_trunk_id,
                participant_identity=phone_number,
                participant_name="Aarogyam Agent",
            )
        else:
            sip_hostname = os.getenv("SIP_OUTBOUND_HOSTNAME")
            sip_username = os.getenv("SIP_OUTBOUND_USERNAME")
            sip_password = os.getenv("SIP_OUTBOUND_PASSWORD")
            sip_number = os.getenv("SIP_OUTBOUND_NUMBER")

            if (
                not sip_hostname
                or not sip_username
                or not sip_password
                or not sip_number
            ):
                print(
                    "Error: For inline configuration, SIP_OUTBOUND_HOSTNAME, SIP_OUTBOUND_USERNAME, SIP_OUTBOUND_PASSWORD, and SIP_OUTBOUND_NUMBER must be set."
                )
                return

            print("2. Initiating SIP call using Inline Trunk Configuration")
            request = api.CreateSIPParticipantRequest(
                room_name=room_name,
                sip_call_to=phone_number,
                sip_number=sip_number,
                participant_identity=phone_number,
                participant_name="Aarogyam Agent",
                trunk=api.SIPOutboundConfig(
                    hostname=sip_hostname,
                    auth_username=sip_username,
                    auth_password=sip_password,
                ),
            )

        participant = await lk_api.sip.create_sip_participant(request)
        print(f"Success! SIP call triggered successfully.")
        print(f"Room name: {room_name}")
        print(f"Participant ID: {participant.participant_id}")
    except Exception as e:
        print(f"Error triggering call: {e}")
    finally:
        await lk_api.aclose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Trigger an outbound Aarogyam health call"
    )
    parser.add_argument(
        "--phone",
        required=True,
        help="Target phone number in E.164 format (e.g., +91XXXXXXXXXX)",
    )
    args = parser.parse_args()
    asyncio.run(trigger_call(args.phone))
