<?php
declare(strict_types=1);

namespace App\Support;

final class HtmlSanitizer
{
    private \HTMLPurifier $purifier;

    public function __construct()
    {
        $config = \HTMLPurifier_Config::createDefault();
        $config->set('HTML.Allowed', 'p,br,strong,em,u,s,h2,h3,h4,ul,ol,li,a[href],blockquote');
        $config->set('URI.AllowedSchemes', ['http' => true, 'https' => true, 'mailto' => true, 'tel' => true]);
        $config->set('Cache.DefinitionImpl', null);
        $this->purifier = new \HTMLPurifier($config);
    }

    public function clean(string $html): string
    {
        return trim($this->purifier->purify($html));
    }
}
