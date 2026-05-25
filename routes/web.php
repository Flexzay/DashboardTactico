<?php

use App\Http\Controllers\ProfileController;
use App\Models\Operation;
use App\Models\TacticalPoint;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
    ]);
});

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {

    // Rutas de Perfil
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');




    Route::get('/operations', function (Request $request) {
        return response()->json(
            Operation::where('user_id', $request->user()->id)
                ->with('points')
                ->orderBy('created_at', 'desc')
                ->get()
        );
    });


    Route::post('/operations', function (Request $request) {
        $validated = $request->validate([
            'name' => 'required|string'
        ]);

        $validated['user_id'] = $request->user()->id;

        $op = Operation::create($validated);
        return response()->json($op->load('points'));
    });


    Route::delete('/operations/{id}', function (Request $request, $id) {
        $op = Operation::where('user_id', $request->user()->id)->findOrFail($id);
        $op->delete();
        return response()->json(['success' => true]);
    });


    Route::put('/operations/{id}/links', function (Request $request, $id) {
        $op = Operation::where('user_id', $request->user()->id)->findOrFail($id);
        $op->update(['links' => $request->links]);
        return response()->json($op);
    });



    Route::get('/tactical-points', function () {
        return response()->json(TacticalPoint::all());
    });


    Route::post('/tactical-points', function (Request $request) {
        $point = TacticalPoint::create($request->validate([
            'operation_id' => 'required|exists:operations,id',
            'type' => 'required|string',
            'lat' => 'required|numeric',
            'lng' => 'required|numeric',
        ]));
        return response()->json($point);
    });


    Route::put('/tactical-points/{id}', function (Request $request, $id) {
        $point = TacticalPoint::findOrFail($id);
        $point->update($request->validate([
            'lat' => 'required|numeric',
            'lng' => 'required|numeric',
        ]));
        return response()->json($point);
    });


   Route::delete('/tactical-points/{id}', function ($id) {
    $point = TacticalPoint::findOrFail($id);
    $operation = Operation::find($point->operation_id);

    if ($operation && $operation->links) {
        $filteredLinks = array_values(array_filter(
            $operation->links,
            function ($link) use ($id) {
                $link = (array) $link; 
                return ($link['from'] ?? null) != $id && ($link['to'] ?? null) != $id;
            }
        ));

        $operation->update(['links' => $filteredLinks]);
    }

    $point->delete();
    return response()->json(['success' => true]);
});
});

require __DIR__ . '/auth.php';
