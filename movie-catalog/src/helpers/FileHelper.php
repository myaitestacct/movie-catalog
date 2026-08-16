<?php

class FileHelper
{
    public static function splitPath(string $filepath): array
    {
        $pos = strrpos($filepath, '\\');
        if ($pos === false) {
            return ['path' => '', 'file' => $filepath];
        }

        return [
            'path' => substr($filepath, 0, $pos),
            'file' => substr($filepath, $pos + 1)
        ];
    }
}
