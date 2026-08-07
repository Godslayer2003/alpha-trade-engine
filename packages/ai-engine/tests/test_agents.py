import os
import unittest

from app import agents


@unittest.skipUnless(os.environ.get('OPENROUTER_API_KEY'), 'OPENROUTER_API_KEY not set — skipping live call')
class TestAgentsAsk(unittest.IsolatedAsyncioTestCase):
    async def test_ask_returns_a_real_reply(self):
        reply = await agents.ask('say hello')
        print(f'\nModel replied: {reply}')
        self.assertIsInstance(reply, str)
        self.assertGreater(len(reply.strip()), 0)
