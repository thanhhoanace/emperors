# Demo 1: ink-style bust portraits, drawn here (original work, no source image). python3 portraits/make.py
import os
INK, SKIN, PAPER = '#2a211a', '#e3bf96', '#efe3c8'
def svg(body):
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">' + body + '</svg>\n'
def face(long=0, stern=True, eyes_y=92):
    ry = 38 + long
    b = []
    b.append(f'<ellipse cx="70" cy="{98+long//2}" rx="6" ry="10" fill="{SKIN}" stroke="{INK}" stroke-width="2.5"/>')
    b.append(f'<ellipse cx="130" cy="{98+long//2}" rx="6" ry="10" fill="{SKIN}" stroke="{INK}" stroke-width="2.5"/>')
    b.append(f'<ellipse cx="100" cy="{96+long//2}" rx="30" ry="{ry}" fill="{SKIN}" stroke="{INK}" stroke-width="3"/>')
    bi = 4 if stern else -2
    b.append(f'<path d="M80 {eyes_y-8+bi} L95 {eyes_y-6-bi}" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>')
    b.append(f'<path d="M120 {eyes_y-8+bi} L105 {eyes_y-6-bi}" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>')
    for x in (88, 112):
        b.append(f'<path d="M{x-7} {eyes_y} Q{x} {eyes_y-5} {x+7} {eyes_y}" fill="none" stroke="{INK}" stroke-width="2.5" stroke-linecap="round"/>')
        b.append(f'<circle cx="{x}" cy="{eyes_y}" r="2.3" fill="{INK}"/>')
    b.append(f'<path d="M100 {eyes_y+2} L97 {eyes_y+16} L103 {eyes_y+17}" fill="none" stroke="{INK}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>')
    b.append(f'<path d="M92 {eyes_y+26+long//2} Q100 {eyes_y+28+long//2} 108 {eyes_y+26+long//2}" fill="none" stroke="{INK}" stroke-width="2.4" stroke-linecap="round"/>')
    return ''.join(b)
def body(robe, collar, armor=False):
    b = [f'<path d="M14 200 Q22 158 62 146 L82 138 L118 138 L138 146 Q178 158 186 200 Z" fill="{robe}" stroke="{INK}" stroke-width="3"/>']
    b.append(f'<path d="M86 132 L86 146 L114 146 L114 132 Z" fill="{SKIN}" stroke="{INK}" stroke-width="2.5"/>')
    b.append(f'<path d="M78 140 L100 176 L122 140" fill="none" stroke="{collar}" stroke-width="9" stroke-linejoin="round"/>')
    if armor:
        for y in (160, 174, 188):
            b.append(f'<path d="M34 {y} Q100 {y-10} 166 {y}" fill="none" stroke="{INK}" stroke-width="1.6" opacity=".55"/>')
        for x in (52, 76, 124, 148):
            b.append(f'<path d="M{x} 152 L{x} 200" stroke="{INK}" stroke-width="1.2" opacity=".35"/>')
    return ''.join(b)
def beard(kind, long=0):
    y = 124 + long
    if kind == 'goatee': return f'<path d="M88 {y-12} Q100 {y-6} 112 {y-12} Q108 {y+14} 100 {y+18} Q92 {y+14} 88 {y-12} Z" fill="{INK}"/><path d="M84 {y-18} Q100 {y-24} 116 {y-18}" fill="none" stroke="{INK}" stroke-width="3.5" stroke-linecap="round"/>'
    if kind == 'full': return f'<path d="M72 {y-26} Q74 {y+10} 100 {y+30} Q126 {y+10} 128 {y-26} Q120 {y-6} 112 {y-12} Q100 {y-8} 88 {y-12} Q80 {y-6} 72 {y-26} Z" fill="{INK}"/><path d="M92 {y-14} Q100 {y-10} 108 {y-14}" fill="none" stroke="{SKIN}" stroke-width="2.5"/>'
    if kind == 'short': return f'<path d="M78 {y-20} Q84 {y+6} 100 {y+8} Q116 {y+6} 122 {y-20} Q112 {y-8} 100 {y-10} Q88 {y-8} 78 {y-20} Z" fill="{INK}" opacity=".9"/>'
    if kind == 'mous': return f'<path d="M86 {y-18} Q100 {y-24} 114 {y-18} Q100 {y-15} 86 {y-18} Z" fill="{INK}"/><path d="M100 {y-4} L100 {y+10}" stroke="{INK}" stroke-width="3"/>'
    return ''
def hat(kind, col):
    if kind == 'emperor':  # the Ming emperors' cap: a rounded crown with two short wings rising behind it
        return (f'<ellipse cx="78" cy="48" rx="12" ry="11" fill="{INK}" transform="rotate(-38 78 48)"/><ellipse cx="122" cy="48" rx="12" ry="11" fill="{INK}" transform="rotate(38 122 48)"/>'
                f'<path d="M70 70 Q70 44 100 42 Q130 44 130 70 Z" fill="{INK}"/>'
                f'<path d="M84 52 Q100 46 116 52" fill="none" stroke="{col}" stroke-width="2.5"/>'
                f'<path d="M70 70 L130 70" stroke="{col}" stroke-width="4"/>')
    if kind == 'helm':
        return (f'<path d="M66 82 Q64 44 100 40 Q136 44 134 82 L126 82 Q124 58 100 56 Q76 58 74 82 Z" fill="#5a5b5e" stroke="{INK}" stroke-width="3"/>'
                f'<path d="M100 40 L100 26" stroke="{INK}" stroke-width="3"/><path d="M100 28 Q116 14 104 4 Q108 18 92 22 Z" fill="{col}" stroke="{INK}" stroke-width="2"/>'
                f'<path d="M66 82 L60 110 L72 104 Z" fill="#5a5b5e" stroke="{INK}" stroke-width="2.5"/><path d="M134 82 L140 110 L128 104 Z" fill="#5a5b5e" stroke="{INK}" stroke-width="2.5"/>')
    if kind == 'official':
        return (f'<path d="M72 66 L74 38 Q100 30 126 38 L128 66 Z" fill="{INK}"/><path d="M80 40 L120 40" stroke="#6b5a45" stroke-width="3"/>'
                f'<path d="M126 52 L150 46" stroke="{INK}" stroke-width="4" stroke-linecap="round"/><path d="M74 52 L50 46" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>')
    if kind == 'band':
        return (f'<path d="M70 72 Q70 48 100 46 Q130 48 130 72 Q116 62 100 62 Q84 62 70 72 Z" fill="{INK}"/>'
                f'<path d="M68 72 Q100 58 132 72" fill="none" stroke="{col}" stroke-width="8"/><path d="M130 70 L146 86 L140 90 Z" fill="{col}" stroke="{INK}" stroke-width="2"/>')
    if kind == 'square':
        return f'<path d="M72 68 L72 42 L128 42 L128 68 Q100 60 72 68 Z" fill="{INK}"/><rect x="84" y="36" width="32" height="8" fill="#5a4a38"/>'
    return ''
P = {
    'zhu':        dict(robe='#c9a13c', collar='#9e2a1e', armor=False, hat=('emperor', '#c9a13c'), beard='goatee', long=6, stern=True, bg='#b3262e'),
    'zhu_huan':   dict(robe='#8e2b24', collar='#3b342c', armor=True, hat=('helm', '#c43b2c'), beard='short', long=0, stern=True, bg='#b3262e'),
    'zhang_liao': dict(robe='#4d6a3a', collar='#2f2a24', armor=True, hat=('helm', '#e8e1cf'), beard='full', long=2, stern=True, bg='#4d6a3a'),
    'man_chong':  dict(robe='#34422c', collar='#e8e1cf', armor=False, hat=('official', ''), beard='mous', long=4, stern=False, bg='#4d6a3a'),
    'zhou_tai':   dict(robe='#b8662a', collar='#2f2a24', armor=True, hat=('band', '#d9772a'), beard='full', long=0, stern=True, bg='#d9772a', scars=True),
    'tran':       dict(robe='#7a6a48', collar='#e8e1cf', armor=False, hat=('square', ''), beard='mous', long=0, stern=False, bg='#8a7a55'),
}
out = os.path.dirname(os.path.abspath(__file__))
for gid, p in P.items():
    b = [f'<rect width="200" height="200" fill="{PAPER}"/>', f'<circle cx="100" cy="96" r="78" fill="{p["bg"]}" opacity=".28"/>']
    for k in range(7):
        b.append(f'<path d="M0 {150+k*9} Q100 {140+k*9} 200 {150+k*9}" fill="none" stroke="{p["bg"]}" stroke-width="1" opacity=".18"/>')
    b.append(body(p['robe'], p['collar'], p['armor']))
    b.append(face(p['long'], p['stern']))
    if p.get('scars'):
        b.append('<path d="M110 84 L124 104 M78 106 L92 116 M114 112 L120 120" stroke="#8a3a2a" stroke-width="2.4" stroke-linecap="round"/>')
    b.append(beard(p['beard'], p['long'] // 2))
    b.append(hat(*p['hat']))
    b.append(f'<rect x="3" y="3" width="194" height="194" fill="none" stroke="{INK}" stroke-width="3" opacity=".6"/>')
    open(os.path.join(out, gid + '.svg'), 'w').write(svg(''.join(b)))
print('wrote', len(P))
