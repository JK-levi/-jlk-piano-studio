"""Build-time audit checks; these small fixtures are not shipped book content."""
import importlib.util
import json
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('book_import', ROOT / 'scripts/import_keyboard_book.py')
IMPORT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(IMPORT)


def fixture():
    # Include rootless/inverted RH order and relative LH octave notation.
    page = {'title': 'Reference fixture', 'mood': 'quiet', 'patch': 'PR002 Mellow Grand',
            'note': 'Keep the supplied order.', 'footer': 'Original footer.',
            'loops': [['LOOP A', [['Cmaj7', 'G - B - C - E', 'C+C\''],
                                  ['Cmaj7', 'G - B - C - E', 'C+C\'']]]], 'easy': True}
    technique = {'title': 'Technique fixture', 'subtitle': 'Source wording',
                 'bullets': ['First.', 'Second.'], 'refTitle': 'Reference fixture',
                 'tryIntro': 'See page {page}.', 'trySteps': ['Try this.']}
    text = '<!doctype html><html><script>\n'
    for name in IMPORT.CONSTANTS:
        text += f'const {name} = "Source note";\n'
    for name in IMPORT.COLLECTIONS:
        text += f'const {name} = ' + json.dumps([technique if name == 'TECHNIQUE_PAGES' else page]) + ';\n'
    text += '</script>\n'
    for name in IMPORT.FRONT:
        text += f'<script>function {name}(){{return `<div>SECOND EDITION · Source front matter.</div>`;}}</script>\n'
    return (text + '</html>').encode()


class BookAuditTests(unittest.TestCase):
    def test_preserves_rows_hand_order_repeats_and_provenance(self):
        result = IMPORT.audit(fixture(), 'Test source, not a latest-edition claim')
        self.assertEqual(result['counts'], {'chordPages': 4, 'techniques': 1, 'blocks': 4, 'rows': 8})
        rows = result['collections']['MOOD_PAGES'][0]['loops'][0][1]
        self.assertEqual(rows, [['Cmaj7', 'G - B - C - E', "C+C'"], ['Cmaj7', 'G - B - C - E', "C+C'"]])
        self.assertEqual(result['collections']['TECHNIQUE_PAGES'][0]['tryIntro'], 'See page {page}.')
        self.assertEqual(result['provenance']['bytes'], len(fixture()))
        self.assertEqual(len(result['provenance']['sha256']), 64)
        changed = IMPORT.audit(fixture().replace(b'quiet', b'tender'), 'New source')
        self.assertNotEqual(result['provenance']['sha256'], changed['provenance']['sha256'])

    def test_snapshot_matches_every_extracted_field_from_archived_source(self):
        snapshot = json.loads((ROOT / 'data/keyboard-book-october-05.json').read_text())
        raw = (ROOT / 'docs/sources/keyboard-progression-book-october-05.html.txt').read_bytes()
        self.assertEqual(IMPORT.audit(raw, snapshot['provenance']['label']), snapshot)

    def test_latest_snapshot_matches_uploaded_october_13_source(self):
        snapshot = json.loads((ROOT / 'data/keyboard-book-october-13.json').read_text())
        raw = (ROOT / 'docs/sources/keyboard-progression-book-october-13.html.txt').read_bytes()
        self.assertEqual(IMPORT.audit(raw, snapshot['provenance']['label']), snapshot)

    def test_accepts_source_object_syntax_and_known_constants_without_eval(self):
        data = IMPORT.Literal('[{title:"Notes",footer:REPEAT_NOTE,easy:true,},]', {'REPEAT_NOTE': 'Keep this.'}).value()
        self.assertEqual(data, [{'title': 'Notes', 'footer': 'Keep this.', 'easy': True}])
        with self.assertRaises(IMPORT.SourceError):
            IMPORT.Literal('fetch("https://example.invalid")', {}).value()
        with self.assertRaises(IMPORT.SourceError):
            IMPORT.declaration('const EASY_PAGES = [].map(alert);', 'EASY_PAGES', {})

    def test_truncated_or_missing_sections_cannot_be_published(self):
        for source in [fixture().replace(b'quiet', '…644 tokens truncated…'.encode()),
                       fixture().replace(b'const MOOD_PAGES', b'const MISSING_PAGES'),
                       fixture()[:-7]]:
            with self.assertRaises(IMPORT.SourceError):
                IMPORT.audit(source, 'Incomplete source')

    def test_rejects_dropped_hand_fields_and_unsafe_front_matter_expressions(self):
        broken = fixture().replace(b'"G - B - C - E", "C+C\'"', b'"G - B - C - E"')
        with self.assertRaisesRegex(IMPORT.SourceError, 'chord, RH notes, LH bass'):
            IMPORT.audit(broken, 'Missing bass')
        with self.assertRaises(IMPORT.SourceError):
            IMPORT.audit(fixture().replace(b'Source front matter.', b'${fetch("x")}'), 'Not static')

    def test_failed_cli_never_writes_a_partial_snapshot(self):
        with tempfile.TemporaryDirectory() as directory:
            source, output = Path(directory) / 'book.html', Path(directory) / 'snapshot.json'
            source.write_bytes(fixture().replace(b'quiet', b'lines truncated'))
            result = subprocess.run(['python3', str(ROOT / 'scripts/import_keyboard_book.py'), str(source),
                                     '--label', 'Incomplete fixture', '--output', str(output)], capture_output=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn(b'Truncation marker', result.stderr)
            self.assertFalse(output.exists())


if __name__ == '__main__':
    unittest.main()
