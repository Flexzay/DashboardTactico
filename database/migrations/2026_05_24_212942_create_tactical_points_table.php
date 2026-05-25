<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('tactical_points', function (Blueprint $table) {
            $table->id();
            $table->foreignId('operation_id')->constrained()->cascadeOnDelete();
            $table->string('type'); // centinela, mortero, etc.
            $table->decimal('lat', 10, 8);
            $table->decimal('lng', 11, 8);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tactical_points');
    }
};
