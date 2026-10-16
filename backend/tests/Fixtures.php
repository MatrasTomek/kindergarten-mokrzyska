<?php
declare(strict_types=1);

namespace Tests;

use Slim\Psr7\UploadedFile;

final class Fixtures
{
    /** @var list<string> */
    private static array $created = [];

    private static function tmp(string $ext): string
    {
        return self::$created[] = sys_get_temp_dir() . '/fx-' . bin2hex(random_bytes(6)) . '.' . $ext;
    }

    /** Usuwa wszystkie pliki tymczasowe utworzone przez fixtures. */
    public static function cleanup(): void
    {
        foreach (self::$created as $path) {
            if (is_file($path)) {
                unlink($path);
            }
        }
        self::$created = [];
    }

    public static function fake(string $content = '<?php echo 1;'): string
    {
        $path = self::tmp('webp');
        file_put_contents($path, $content);
        return $path;
    }

    private static function image(int $w, int $h): \GdImage
    {
        $img = imagecreatetruecolor($w, $h);
        imagefill($img, 0, 0, imagecolorallocate($img, 200, 50, 50));
        return $img;
    }

    public static function webp(int $w = 40, int $h = 30): string
    {
        $path = self::tmp('webp');
        imagewebp(self::image($w, $h), $path);
        return $path;
    }

    public static function jpeg(int $w = 40, int $h = 30): string
    {
        $path = self::tmp('jpg');
        imagejpeg(self::image($w, $h), $path);
        return $path;
    }

    public static function png(int $w = 40, int $h = 30): string
    {
        $path = self::tmp('png');
        imagepng(self::image($w, $h), $path);
        return $path;
    }

    public static function pdf(): string
    {
        $path = self::tmp('pdf');
        file_put_contents($path, "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
        return $path;
    }

    public static function uploaded(string $path, string $name, ?int $size = null, int $error = UPLOAD_ERR_OK): UploadedFile
    {
        return new UploadedFile($path, $name, mime_content_type($path) ?: null, $size ?? filesize($path), $error);
    }
}
