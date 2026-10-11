<?php

class Request
{
    public static function get(string $key, $default = null)
    {
        $value = filter_input(INPUT_GET, $key, FILTER_SANITIZE_SPECIAL_CHARS);
        return ($value !== null && $value !== '') ? $value : $default;
    }

    public static function int(string $key, int $default = 0): int
    {
        $value = filter_input(INPUT_GET, $key, FILTER_VALIDATE_INT);
        return ($value !== false && $value !== null) ? $value : $default;
    }

    // New method to safely get SCRIPT_NAME or other SERVER variables
    public static function server(string $key, $default = null)
    {
        return $_SERVER[$key] ?? $default;
    }
}

