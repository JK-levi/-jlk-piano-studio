#!/usr/bin/env python3
"""Audit literal book data without executing any of the source JavaScript.

This is build-time tooling, not an application dependency. Keep the original
HTML alongside its SHA-256 when publishing a content snapshot. Counts describe
this input only; they do not establish that it is the latest source edition.
"""
import argparse
import hashlib
import html
import json
import re
from pathlib import Path

COLLECTIONS = ('EASY_PAGES', 'TECHNIQUE_PAGES', 'MORE_PROGRESSIONS',
               'MOOD_PAGES', 'SONG_PAGES')
CONSTANTS = ('REPEAT_NOTE', 'SKETCH_NOTE', 'EASY_NOTE')
FRONT = ('renderCover', 'renderHowTo', 'renderDivider', 'renderKeepPlaying')


class SourceError(ValueError):
    pass


class Literal:
    """Only arrays, objects, JSON strings, booleans and known string constants."""
    def __init__(self, source, constants):
        self.source, self.constants, self.pos = source, constants, 0

    def skip(self):
        while True:
            match = re.match(r'\s+|//[^\n]*|/\*[\s\S]*?\*/', self.source[self.pos:])
            if not match:
                return
            self.pos += match.end()

    def take(self, char):
        self.skip()
        if self.source[self.pos:self.pos + 1] == char:
            self.pos += 1
            return True
        return False

    def token(self):
        self.skip()
        match = re.match(r'[A-Za-z_$][\w$]*', self.source[self.pos:])
        if not match:
            raise SourceError('Expected a literal field or constant, not JavaScript code.')
        self.pos += match.end()
        return match.group()

    def value(self):
        self.skip()
        if self.pos >= len(self.source):
            raise SourceError('The source ends inside a book value.')
        if self.source[self.pos] == '"':
            value, length = json.JSONDecoder().raw_decode(self.source[self.pos:])
            self.pos += length
            return value
        if self.take('['):
            values = []
            while not self.take(']'):
                values.append(self.value())
                if self.take(']'):
                    break
                if not self.take(','):
                    raise SourceError('Expected a comma in a source array.')
            return values
        if self.take('{'):
            values = {}
            while not self.take('}'):
                self.skip()
                key = self.value() if self.source[self.pos:self.pos + 1] == '"' else self.token()
                if not isinstance(key, str) or key in values:
                    raise SourceError('Invalid or duplicate source field.')
                if not self.take(':'):
                    raise SourceError('Expected a colon after a source field.')
                values[key] = self.value()
                if self.take('}'):
                    break
                if not self.take(','):
                    raise SourceError('Expected a comma in a source object.')
            return values
        name = self.token()
        if name in ('true', 'false'):
            return name == 'true'
        if name in self.constants:
            return self.constants[name]
        raise SourceError(f'Unsupported expression or unknown constant: {name}')


def declaration(source, name, constants):
    matches = list(re.finditer(r'\bconst\s+' + re.escape(name) + r'\s*=', source))
    if len(matches) != 1:
        raise SourceError(f'Expected exactly one {name} declaration; source may be incomplete.')
    parser = Literal(source[matches[0].end():], constants)
    result = parser.value()
    if not parser.take(';'):
        raise SourceError(f'{name} must contain only literal data followed by a semicolon.')
    return result


def require_text(value, context):
    if not isinstance(value, str) or not value.strip():
        raise SourceError(f'Missing text: {context}')


def audit(raw, label):
    source = raw.decode('utf-8')
    # Some message transports escape a whole HTML attachment. Never unescape
    # the interior of a normal HTML file: that could change actual music text.
    if source.lstrip().startswith('&lt;'):
        source = html.unescape(source)
    if re.search(r'\b(?:tokens?|lines?|characters?)\s+truncated\b', source, re.I):
        raise SourceError('Truncation marker found. Obtain the missing source excerpt; do not reconstruct it.')
    if not source.rstrip().lower().endswith('</html>'):
        raise SourceError('Missing HTML end marker; source may be incomplete.')
    constants = {}
    for name in CONSTANTS:
        constants[name] = declaration(source, name, constants)
        require_text(constants[name], name)
    collections = {name: declaration(source, name, constants) for name in COLLECTIONS}
    counts = {'chordPages': 0, 'techniques': 0, 'blocks': 0, 'rows': 0}
    for name, pages in collections.items():
        if not isinstance(pages, list) or not pages:
            raise SourceError(f'{name} is missing or empty.')
        for page in pages:
            if not isinstance(page, dict):
                raise SourceError(f'Invalid page in {name}.')
            require_text(page.get('title'), f'{name} title')
            if name == 'TECHNIQUE_PAGES':
                for field in ('subtitle', 'refTitle', 'tryIntro'):
                    require_text(page.get(field), f'{page["title"]} {field}')
                for field in ('bullets', 'trySteps'):
                    if not isinstance(page.get(field), list) or not page[field]:
                        raise SourceError(f'Missing {field}: {page["title"]}')
                    for value in page[field]:
                        require_text(value, f'{page["title"]} {field}')
                counts['techniques'] += 1
            else:
                for field in ('mood', 'patch', 'note', 'footer'):
                    require_text(page.get(field), f'{page["title"]} {field}')
                if not isinstance(page.get('loops'), list) or not page['loops']:
                    raise SourceError(f'Missing loops: {page["title"]}')
                for block in page['loops']:
                    if not isinstance(block, list) or len(block) != 2:
                        raise SourceError(f'Invalid loop: {page["title"]}')
                    require_text(block[0], f'{page["title"]} loop name')
                    if not isinstance(block[1], list) or not block[1]:
                        raise SourceError(f'Empty loop: {page["title"]}')
                    for row in block[1]:
                        if not isinstance(row, list) or len(row) != 3:
                            raise SourceError('Each row must be exactly [chord, RH notes, LH bass].')
                        for part in row:
                            require_text(part, f'{page["title"]} chord/RH/LH row')
                        counts['rows'] += 1
                    counts['blocks'] += 1
                counts['chordPages'] += 1
    templates = {}
    for name in FRONT:
        match = re.search(r'function\s+' + name + r'\s*\(\)\s*\{\s*return\s*`([^`]*)`\s*;\s*\}', source)
        if not match or '${' in match[1]:
            raise SourceError(f'Cannot preserve static front matter: {name}; review the source format.')
        templates[name] = match[1]
    edition = re.search(r'\b(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth)\s+Edition\b', templates['renderCover'], re.I)
    if not edition:
        raise SourceError('Missing ordinal edition name in source cover.')
    return {
        'format': 1,
        'edition': edition[1].capitalize() + ' Edition',
        'provenance': {'label': label, 'sha256': hashlib.sha256(raw).hexdigest(), 'bytes': len(raw)},
        'counts': counts,
        'sectionCounts': {name: len(pages) for name, pages in collections.items()},
        'constants': constants,
        'collections': collections,
        'frontMatterSource': templates,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('--label', required=True, help='Human-readable source/version provenance; not a latest-version claim.')
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    try:
        result = audit(args.source.read_bytes(), args.label)
    except (ValueError, OSError, UnicodeError) as error:
        parser.exit(1, f'Book audit failed: {error}\n')
    if args.output:
        args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({key: result[key] for key in ('provenance', 'counts', 'sectionCounts')}, indent=2))


if __name__ == '__main__':
    main()
