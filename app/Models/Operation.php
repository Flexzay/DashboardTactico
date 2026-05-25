<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Operation extends Model
{
    protected $fillable = ['name', 'user_id', 'links'];


    protected $casts = [
        'links' => 'array',
    ];

    public function points()
    {
        return $this->hasMany(TacticalPoint::class);
    }
}
