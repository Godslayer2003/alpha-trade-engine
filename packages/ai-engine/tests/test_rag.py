import unittest

from app import rag


class TestChunkText(unittest.TestCase):
    def test_preserves_sentences_and_indexes_chunks(self):
        chunks = rag.chunk_text('One short sentence. Another short sentence.', 8)
        self.assertGreaterEqual(len(chunks), 1)
        self.assertEqual([chunk.index for chunk in chunks], list(range(len(chunks))))
        self.assertEqual(' '.join(chunk.text for chunk in chunks), 'One short sentence. Another short sentence.')

    def test_rejects_invalid_chunk_sizes(self):
        with self.assertRaises(ValueError):
            rag.chunk_text('Hello.', 0)
        with self.assertRaises(ValueError):
            rag.chunk_text('Hello.', 4097)


if __name__ == '__main__':
    unittest.main()
