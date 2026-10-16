<?php
declare(strict_types=1);

namespace App\Upload;

use App\Config;
use App\Database;
use App\Support\Clock;

final class UploadCleaner
{
    private const MIN_AGE_SECONDS = 86400;

    private readonly UploadService $paths;
    /** @var list<string> */
    private array $failed = [];

    public function __construct(private readonly Database $db, private readonly Config $config, private readonly Clock $clock)
    {
        $this->paths = new UploadService($config, $clock);
    }

    /** @return list<string> ścieżki, których nie udało się usunąć w ostatnim run() */
    public function failed(): array
    {
        return $this->failed;
    }

    /**
     * @return list<string> usunięte (lub przy $dryRun: do usunięcia) ścieżki względne
     * @throws \RuntimeException gdy baza nie ma żadnych wpisów ani treści, a są pliki do usunięcia (chroni przed złą bazą) - chyba że $force
     */
    public function run(bool $dryRun = false, bool $force = false): array
    {
        $this->failed = [];
        $base = $this->config->uploadDir;
        if (!is_dir($base)) {
            return [];
        }
        // Najpierw baza: jeśli odczyt się nie uda, wyjątek przerywa przed jakimkolwiek usunięciem.
        $referenced = array_flip($this->referenced());
        $threshold = $this->clock->now()->getTimestamp() - self::MIN_AGE_SECONDS;
        $removed = [];
        $candidates = [];
        $names = [];

        // Bez FOLLOW_SYMLINKS: dowiązania do katalogów nie są przeglądane.
        $it = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($base, \FilesystemIterator::SKIP_DOTS));
        foreach ($it as $file) {
            /** @var \SplFileInfo $file */
            if ($file->isLink() || !$file->isFile()) {
                continue;
            }
            $rel = substr($file->getPathname(), strlen($base) + 1);
            // Allowlista: tylko pliki o kształcie tworzonym przez UploadService.
            if (!$this->isManaged($rel) || isset($referenced[$rel]) || $file->getMTime() >= $threshold) {
                continue;
            }
            $candidates[] = $file->getPathname();
            $names[$file->getPathname()] = $rel;
        }
        if ($candidates !== [] && !$force && !$this->hasAnyDocument()) {
            throw new \RuntimeException('Baza nie zawiera żadnych wpisów ani treści stron - to wygląda na złą bazę. Nic nie usunięto. Użyj --force, aby wymusić.');
        }
        foreach ($candidates as $abs) {
            if (!$dryRun && !@unlink($abs)) {
                $this->failed[] = $names[$abs];
                continue;
            }
            $removed[] = $names[$abs];
        }
        sort($removed);
        return $removed;
    }

    private function isManaged(string $rel): bool
    {
        return $this->paths->isImagePath($rel, 'posts') || $this->paths->isImagePath($rel, 'content') || $this->paths->isPdfPath($rel);
    }

    private function hasAnyDocument(): bool
    {
        return $this->db->collection('posts')->countDocuments([], ['limit' => 1]) > 0
            || $this->db->collection('content_items')->countDocuments([], ['limit' => 1]) > 0;
    }

    /** @return list<string> */
    private function referenced(): array
    {
        $paths = [];
        foreach ($this->db->collection('posts')->find([], ['projection' => ['images' => 1]]) as $doc) {
            $this->collect($paths, $doc['images'] ?? null, ['file', 'thumb']);
        }
        foreach ($this->db->collection('content_items')->find([], ['projection' => ['images' => 1, 'attachments' => 1]]) as $doc) {
            $this->collect($paths, $doc['images'] ?? null, ['file', 'thumb']);
            $this->collect($paths, $doc['attachments'] ?? null, ['file']);
        }
        return $paths;
    }

    /**
     * @param list<string> $paths
     * @param list<string> $keys
     */
    private function collect(array &$paths, mixed $items, array $keys): void
    {
        if (!is_array($items)) {
            return;
        }
        foreach ($items as $item) {
            if (!is_array($item)) {
                continue;
            }
            foreach ($keys as $key) {
                if (is_string($item[$key] ?? null)) {
                    $paths[] = $item[$key];
                }
            }
        }
    }
}
