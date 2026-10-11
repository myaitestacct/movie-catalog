<?php

class Pagination
{
    public int $page;
    public int $limit;
    public int $offset;

    public function __construct(int $page, int $limit, int $maxLimit = 200)
    {
        $this->page   = max(1, $page);
        $this->limit  = min(max(1, $limit), $maxLimit);
        $this->offset = ($this->page - 1) * $this->limit;
    }
}
