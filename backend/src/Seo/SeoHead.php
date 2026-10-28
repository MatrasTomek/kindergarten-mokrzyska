<?php
declare(strict_types=1);

namespace App\Seo;

/**
 * Meta tagi strony (title, description, canonical, Open Graph, robots) wstawiane do powłoki aplikacji
 * (index.csr.html). Te same tagi Angular ustawia po starcie (core/seo.ts) — tu są dla robotów bez JS
 * (podgląd linków na Facebooku/Messengerze) i dla pierwszego odczytu przez wyszukiwarki.
 */
final class SeoHead
{
    public function __construct(
        public readonly string $title,
        public readonly string $path,
        public readonly string $description = '',
        public readonly string $image = '',
        public readonly string $type = 'website',
        public readonly bool $noindex = false,
    ) {
    }

    /** Podmienia <title> powłoki na tytuł i tagi tej strony (bez <title> — wstawia przed </head>). */
    public static function inject(string $shell, self $head): string
    {
        $tags = $head->tags();
        $count = 0;
        // Callback, nie łańcuch zastępujący: "$1" albo "\0" w tytule wpisu nie mogą być odwołaniami do grup.
        $html = (string) preg_replace_callback('#<title>.*?</title>#s', fn () => $tags, $shell, 1, $count);
        return $count > 0 ? $html : (string) preg_replace_callback('#</head>#i', fn () => "$tags\n</head>", $shell, 1);
    }

    /** Tekst do meta description: bez znaczników i encji, max 160 znaków (jak describe() w post-detail.page.ts). */
    public static function shorten(string $html): string
    {
        $text = html_entity_decode((string) preg_replace('/<[^>]*>/', ' ', $html), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = trim((string) preg_replace('/[\s\x{00A0}]+/u', ' ', $text));
        return mb_strlen($text) > 160 ? rtrim(mb_substr($text, 0, 157)) . '…' : $text;
    }

    private function tags(): string
    {
        $e = fn (string $s): string => htmlspecialchars($s, ENT_QUOTES | ENT_HTML5 | ENT_SUBSTITUTE, 'UTF-8');
        $url = Site::URL . $this->path;
        $description = $this->description !== '' ? $this->description : Site::DEFAULT_DESCRIPTION;
        $image = match (true) {
            $this->image === '' => Site::DEFAULT_IMAGE,
            str_starts_with($this->image, 'http') => $this->image,
            default => Site::URL . $this->image,
        };
        $lines = ['<title>' . $e($this->title) . '</title>', '<meta name="description" content="' . $e($description) . '">'];
        foreach ([
            'og:type' => $this->type,
            'og:site_name' => Site::SHORT_NAME,
            'og:locale' => 'pl_PL',
            'og:title' => $this->title,
            'og:description' => $description,
            'og:url' => $url,
            'og:image' => $image,
        ] as $property => $content) {
            $lines[] = '<meta property="' . $property . '" content="' . $e($content) . '">';
        }
        $lines[] = '<meta name="twitter:card" content="summary">';
        if ($this->noindex) {
            $lines[] = '<meta name="robots" content="noindex">';
        }
        $lines[] = '<link rel="canonical" href="' . $e($url) . '">';
        return implode("\n  ", $lines);
    }
}
