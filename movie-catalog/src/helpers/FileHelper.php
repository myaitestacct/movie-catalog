<?php

class FileHelper
{
    public static function splitPath(string $filepath): array
    {
        $backslashPos = strrpos($filepath, '\\');
        $slashPos = strrpos($filepath, '/');

        $pos = max(
            $backslashPos === false ? -1 : $backslashPos,
            $slashPos === false ? -1 : $slashPos
        );

        if ($pos === -1) {
            return ['path' => '', 'file' => $filepath];
        }

        return [
            'path' => substr($filepath, 0, $pos),
            'file' => substr($filepath, $pos + 1)
        ];
    }
}
