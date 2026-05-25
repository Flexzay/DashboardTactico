<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TacticalPoint extends Model
{
    protected $fillable = ['type', 'lat', 'lng', 'operation_id'];
}
