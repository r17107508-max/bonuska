from pathlib import Path
import math
import shutil

from PIL import Image, ImageDraw, ImageFilter, ImageFont
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas


ROOT = Path.cwd()
RAW = ROOT / "output" / "screenshots-tega"
OUT = ROOT / "output" / "tega-for-friend"
PAGES = OUT / "pages"
SHOTS = OUT / "screenshots"
PDF = OUT / "TEGA_Coffee_presentation_for_friend.pdf"

for folder in (OUT, PAGES, SHOTS):
    folder.mkdir(parents=True, exist_ok=True)

W, H = 1920, 1080
CREAM = "#F7EFE4"
MILK = "#FFFAF2"
COFFEE = "#2A160D"
COCOA = "#5D3825"
CARAMEL = "#C68447"
FOAM = "#EAD6BF"
GREEN = "#3F6B36"
RED = "#8C2F21"

FONT_PATHS = [
    r"C:\Windows\Fonts\segoeui.ttf",
    r"C:\Windows\Fonts\arial.ttf",
    r"C:\Windows\Fonts\calibri.ttf",
]
BOLD_PATHS = [
    r"C:\Windows\Fonts\segoeuib.ttf",
    r"C:\Windows\Fonts\arialbd.ttf",
    r"C:\Windows\Fonts\calibrib.ttf",
]
FONT = next((path for path in FONT_PATHS if Path(path).exists()), None)
BOLD = next((path for path in BOLD_PATHS if Path(path).exists()), FONT)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(BOLD if bold else FONT, size)


def new_page(bg: str = CREAM):
    image = Image.new("RGB", (W, H), bg)
    draw = ImageDraw.Draw(image)
    draw.ellipse((W - 520, -220, W + 180, 480), fill="#F0D8BC")
    draw.ellipse((-260, H - 360, 430, H + 260), fill="#E7C9A7")
    return image, draw


def wrap_text(text: str, text_font: ImageFont.FreeTypeFont, max_width: int):
    words = text.split()
    lines = []
    line = ""
    probe = ImageDraw.Draw(Image.new("RGB", (10, 10)))
    for word in words:
        candidate = f"{line} {word}".strip()
        if probe.textbbox((0, 0), candidate, font=text_font)[2] <= max_width:
            line = candidate
        else:
            if line:
                lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def text_block(draw, xy, text: str, text_font, fill: str, max_width: int, line_gap: int = 10):
    x, y = xy
    for paragraph in text.split("\n"):
        if not paragraph.strip():
            y += text_font.size // 2
            continue
        for line in wrap_text(paragraph, text_font, max_width):
            draw.text((x, y), line, font=text_font, fill=fill)
            y += text_font.size + line_gap
    return y


def rounded(draw, box, fill, outline=None, width: int = 2, radius: int = 36):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def header(draw, title: str, subtitle: str | None = None):
    draw.text((90, 70), "ТЕГА Coffee", font=font(34, True), fill=COFFEE)
    draw.text((90, 130), title, font=font(64, True), fill=COFFEE)
    if subtitle:
        text_block(draw, (92, 220), subtitle, font(30), COCOA, 1000, 8)


def callout(draw, x: int, y: int, text: str, color: str = COFFEE, max_width: int = 560):
    title_font = font(31, True)
    body_font = font(25)
    lines = wrap_text(text, body_font, max_width)
    height = 42 + len(lines) * 34 + 24
    rounded(draw, (x, y, x + max_width + 44, y + height), MILK, outline=CARAMEL, width=3, radius=26)
    draw.ellipse((x + 20, y + 24, x + 54, y + 58), fill=color)
    current_y = y + 19
    for index, line in enumerate(lines):
        draw.text((x + 72, current_y), line, font=title_font if index == 0 else body_font, fill=color)
        current_y += 38 if index == 0 else 33


def arrow(draw, start, end, color: str = CARAMEL):
    draw.line((start, end), fill=color, width=7)
    ex, ey = end
    sx, sy = start
    angle = math.atan2(ey - sy, ex - sx)
    for delta in (2.6, -2.6):
        a = angle + delta
        draw.line((ex, ey, ex - 34 * math.cos(a), ey - 34 * math.sin(a)), fill=color, width=7)


def phone_frame(base, screenshot_path: Path, x: int = 1240, y: int = 95, w: int = 420, h: int = 890):
    draw = ImageDraw.Draw(base)
    shadow = Image.new("RGBA", (w + 80, h + 80), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle((35, 35, w + 35, h + 35), radius=58, fill=(42, 22, 13, 75))
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    base.paste(shadow, (x - 40, y - 35), shadow)
    draw.rounded_rectangle((x, y, x + w, y + h), radius=58, fill=COFFEE)
    inner = (x + 18, y + 22, x + w - 18, y + h - 22)
    draw.rounded_rectangle(inner, radius=42, fill="white")

    screenshot = Image.open(screenshot_path).convert("RGB")
    ratio = (inner[2] - inner[0]) / screenshot.width
    target_height = int((inner[3] - inner[1]) / ratio)
    screenshot = screenshot.crop((0, 0, screenshot.width, min(screenshot.height, target_height)))
    screenshot = screenshot.resize((inner[2] - inner[0], int(screenshot.height * ratio)), Image.LANCZOS)
    if screenshot.height > inner[3] - inner[1]:
        screenshot = screenshot.crop((0, 0, screenshot.width, inner[3] - inner[1]))

    mask = Image.new("L", screenshot.size, 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle((0, 0, screenshot.width, screenshot.height), radius=36, fill=255)
    base.paste(screenshot, (inner[0], inner[1]), mask)
    draw.rounded_rectangle(inner, radius=42, outline="#1A0D08", width=3)
    return inner


def save_page(number: int, name: str, image: Image.Image):
    path = PAGES / f"{number:02d}-{name}.png"
    image.save(path, quality=95)
    return path


pages = []

# 1. Cover
img, d = new_page()
rounded(d, (90, 80, 1830, 1000), MILK, outline="#E2C5A4", width=3, radius=52)
d.text((150, 150), "ТЕГА Coffee", font=font(84, True), fill=COFFEE)
d.text((150, 260), "MVP программы лояльности", font=font(54, True), fill=COCOA)
text_block(
    d,
    (150, 355),
    "Каждый 7-й кофе в подарок: клиент показывает QR-код, администратор подтверждает покупку, после 6 оплаченных чашек следующий кофе бесплатный.",
    font(34),
    COCOA,
    920,
    12,
)
for i in range(6):
    x = 155 + i * 88
    d.rounded_rectangle((x, 570, x + 66, 636), radius=18, fill=CARAMEL)
    d.ellipse((x + 18, 586, x + 48, 616), fill=MILK)
rounded(d, (150, 715, 860, 855), COFFEE, radius=30)
d.text((190, 750), "Что внутри PDF", font=font(32, True), fill=MILK)
d.text((190, 800), "Доступ из Москвы, сценарии, установка на телефон", font=font(25), fill=FOAM)
phone_frame(img, RAW / "01-home-mobile.png", x=1260, y=120, w=430, h=860)
pages.append(save_page(1, "cover", img))

# 2. Remote access
img, d = new_page()
header(
    d,
    "Как другу открыть приложение из Москвы",
    "Твой локальный адрес 192.168.0.107 работает только в твоей Wi-Fi сети. Из Москвы он не откроется напрямую.",
)
items = [
    ("Лучший вариант", "Загрузить приложение на хостинг с HTTPS. Тогда друг получит обычную ссылку, а камера QR будет работать."),
    ("Быстрый вариант", "Сделать временную HTTPS-ссылку через туннель. Это удобно для показа, но ссылку не стоит держать открытой постоянно."),
    ("Что отправить другу", "Ссылку вида https://... и тестовые логины. Для публичного показа лучше сменить пароль администратора."),
]
y = 360
for title, body in items:
    rounded(d, (120, y, 1120, y + 145), MILK, outline="#E2C5A4", radius=28)
    d.text((160, y + 28), title, font=font(32, True), fill=COFFEE)
    text_block(d, (160, y + 74), body, font(25), COCOA, 850, 6)
    y += 175
rounded(d, (1210, 330, 1760, 760), COFFEE, radius=42)
d.text((1260, 390), "Важно", font=font(46, True), fill=MILK)
text_block(d, (1260, 470), "Для реального сканирования QR с телефона нужен HTTPS. На локальном HTTP камера может не открыться.", font(31), FOAM, 410, 10)
pages.append(save_page(2, "remote-access", img))

# 3-7. App screens
screen_pages = [
    (
        3,
        "home-annotated",
        "Приветственная страница",
        "Первый экран объясняет идею: 6 оплаченных кофе, 7-й - подарок. Клиент может войти или зарегистрироваться.",
        "01-home-mobile.png",
        [
            ("Сразу понятно, что это программа лояльности кофейни", 110, 360, COFFEE),
            ("Две главные кнопки: вход и регистрация клиента", 150, 560, COFFEE),
        ],
    ),
    (
        4,
        "client-dashboard-annotated",
        "Кабинет клиента",
        "Клиент видит личный QR-код, прогресс чашек, историю и токен для локального теста.",
        "02-client-dashboard-mobile.png",
        [
            ("QR-код содержит защищённый токен, а не телефон клиента", 120, 340, COFFEE),
            ("Шкала из 6 чашек показывает прогресс до подарка", 155, 545, COFFEE),
            ("История фиксирует покупки и бесплатные кофе", 180, 760, COFFEE),
        ],
    ),
    (
        5,
        "admin-dashboard-annotated",
        "Админ-панель",
        "Администратор входит отдельно, видит сканер QR, список клиентов и последние операции.",
        "03-admin-dashboard-mobile.png",
        [
            ("Главная кнопка для кассы: открыть сканер QR-кода", 130, 360, COFFEE),
            ("Раздел клиентов помогает найти человека по имени или телефону", 155, 575, COFFEE),
            ("Последние операции показывают, что сделал администратор", 165, 775, COFFEE),
        ],
    ),
    (
        6,
        "admin-client-card-annotated",
        "Карточка клиента после QR",
        "После сканирования администратор видит имя, телефон, прогресс и доступность подарка.",
        "05-admin-client-card-mobile.png",
        [
            ("Если подарок не доступен - кнопка начисляет одну покупку", 110, 330, COFFEE),
            ("Если накоплено 6/6 - появляется выдача бесплатного кофе", 140, 540, COFFEE),
            ("Любое действие проходит через подтверждение, чтобы случайно не начислить лишнее", 175, 755, COFFEE),
        ],
    ),
    (
        7,
        "scanner-annotated",
        "Сканер QR-кода",
        "На хостинге с HTTPS камера откроется. В локальном тесте по HTTP можно использовать ручной ввод токена.",
        "06-admin-scan-mobile.png",
        [
            ("Камера на телефоне требует HTTPS - это правило браузеров", 110, 345, RED),
            ("Для локального теста вставь токен клиента из его кабинета", 145, 570, COFFEE),
            ("На реальном домене сканер будет работать как обычная камера", 170, 780, GREEN),
        ],
    ),
]
for number, name, title, subtitle, screenshot, labels in screen_pages:
    img, d = new_page()
    header(d, title, subtitle)
    phone_frame(img, RAW / screenshot)
    for text, x, y, color in labels:
        callout(d, x, y, text, color=color)
    pages.append(save_page(number, name, img))

# 8. iPhone
img, d = new_page()
header(d, "Как установить на iPhone", "Открой ссылку в Safari. После добавления приложение появится на домашнем экране как обычная иконка.")
rounded(d, (190, 310, 800, 900), MILK, outline="#E2C5A4", radius=46)
d.text((245, 360), "Safari", font=font(38, True), fill=COFFEE)
for i, (num, body) in enumerate(
    [
        ("1", "Открой HTTPS-ссылку"),
        ("2", "Нажми кнопку Поделиться"),
        ("3", "Выбери На экран Домой"),
        ("4", "Нажми Добавить"),
    ]
):
    y = 445 + i * 90
    d.ellipse((250, y, 305, y + 55), fill=CARAMEL)
    d.text((269, y + 8), num, font=font(28, True), fill=MILK)
    d.text((325, y + 10), body, font=font(30), fill=COCOA)
rounded(d, (970, 330, 1600, 840), COFFEE, radius=42)
d.text((1035, 405), "На iPhone", font=font(48, True), fill=MILK)
text_block(d, (1035, 490), "Safari - Поделиться - На экран Домой - Добавить. После этого иконка ТЕГА Coffee будет запускать PWA без поиска ссылки в браузере.", font(32), FOAM, 465, 10)
pages.append(save_page(8, "iphone-install", img))

# 9. Android
img, d = new_page()
header(d, "Как установить на Android", "Открой ссылку в Chrome. Браузер предложит установить приложение или добавить его на главный экран.")
rounded(d, (190, 310, 820, 900), MILK, outline="#E2C5A4", radius=46)
d.text((245, 360), "Chrome", font=font(38, True), fill=COFFEE)
for i, (num, body) in enumerate(
    [
        ("1", "Открой HTTPS-ссылку"),
        ("2", "Нажми меню ⋮"),
        ("3", "Выбери Установить приложение"),
        ("4", "Подтверди установку"),
    ]
):
    y = 445 + i * 90
    d.ellipse((250, y, 305, y + 55), fill=CARAMEL)
    d.text((269, y + 8), num, font=font(28, True), fill=MILK)
    d.text((325, y + 10), body, font=font(30), fill=COCOA)
rounded(d, (970, 330, 1600, 840), COFFEE, radius=42)
d.text((1035, 405), "На Android", font=font(48, True), fill=MILK)
text_block(d, (1035, 490), "Chrome - меню ⋮ - Установить приложение. Если пункта нет, выбери Добавить на главный экран.", font(32), FOAM, 465, 10)
pages.append(save_page(9, "android-install", img))

# 10. Message
img, d = new_page()
header(d, "Что отправить другу", "Готовый текст можно переслать в Telegram или WhatsApp вместе с PDF.")
message = (
    "Привет! Я сделал MVP веб-приложения для кофейни ТЕГА: программа лояльности “каждый 7-й кофе в подарок”. "
    "Клиент регистрируется, видит личный QR-код, администратор сканирует его на кассе и подтверждает покупку. "
    "После 6 покупок следующий кофе бесплатный, затем счётчик сбрасывается.\n\n"
    "Чтобы посмотреть живую версию, нужна HTTPS-ссылка на хостинге или временная ссылка-туннель. "
    "Локальный адрес 192.168... работает только у меня в Wi-Fi, из Москвы он не откроется.\n\n"
    "Тестовые доступы:\n"
    "Клиент: 79991111111 / test123\n"
    "Админ: 79990000000 / admin123"
)
rounded(d, (120, 330, 1180, 910), MILK, outline="#E2C5A4", radius=36)
text_block(d, (170, 380), message, font(30), COCOA, 950, 9)
rounded(d, (1260, 365, 1740, 790), COFFEE, radius=42)
d.text((1310, 430), "Совет", font=font(46, True), fill=MILK)
text_block(d, (1310, 510), "Перед публикацией в интернет лучше сменить пароль администратора и заменить AUTH_SECRET в .env.", font(30), FOAM, 360, 10)
pages.append(save_page(10, "message-and-logins", img))

for page in pages:
    shutil.copy2(page, SHOTS / page.name)

pdf = canvas.Canvas(str(PDF), pagesize=landscape(A4))
page_w, page_h = landscape(A4)
for page in pages:
    pdf.drawImage(ImageReader(str(page)), 0, 0, width=page_w, height=page_h)
    pdf.showPage()
pdf.save()

print(PDF)
print(SHOTS)
