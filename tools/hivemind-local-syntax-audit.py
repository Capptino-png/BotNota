#!/usr/bin/env python3
"""Diagnostico isolado do index.js local. NAO modifica o original.
Executa: python scripts/audit_local_hivemind.py --root /storage/emulated/0/Importante/Hivemind
"""
from pathlib import Path
import argparse
import subprocess
import tempfile
import re

def inspect(root):
    p = root / 'index.js'
    original = p.read_text(encoding='utf-8')
    lines = original.splitlines(keepends=True)
    findings = []
    with tempfile.TemporaryDirectory(prefix='hivemind-audit-') as td:
        test = Path(td) / 'index.js'
        for _ in range(100):
            test.write_text(''.join(lines), encoding='utf-8')
            result = subprocess.run(['node', '--check', str(test)], capture_output=True, text=True)
            if result.returncode == 0:
                print('Validacao da copia temporaria: OK')
                break
            match = re.search(r"index\.js:(\d+)[\s\S]*?SyntaxError: Identifier '([^']+)' has already been declared", result.stderr)
            if not match:
                print('Erro nao classificado:', result.stderr[-1800:])
                return 2
            no, name = int(match.group(1)), match.group(2)
            previous = [i for i, line in enumerate(lines[:no-1], 1) if re.search(r'\b(?:const|let|var)\s+'+re.escape(name)+r'\b', line)]
            findings.append((no, name, previous))
            line = lines[no-1]
            replaced, count = re.subn(r'\b(?:const|let)\s+'+re.escape(name)+r'\b', name, line, count=1)
            if count != 1:
                print('Nao foi possivel continuar; estrutura inesperada:', no, name)
                return 2
            lines[no-1] = replaced
        else:
            print('Limite de verificacoes atingido')
            return 2
    print('Declaracoes em conflito detectadas (nenhuma alteracao aplicada):')
    for no, name, earlier in findings:
        print(f'  {no}: {name}; ocorrencias anteriores: {earlier[-6:]}')
    print(f'Total: {len(findings)}')
    print('Arquivo original preservado:', p)
    return 0

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path, required=True)
    args = parser.parse_args()
    raise SystemExit(inspect(args.root))
