// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::{Command, Stdio};
use std::{thread, time};
use std::net::TcpStream;

fn main() {
    // Lanza el backend Go como proceso hijo
    let _go_backend = Command::new("go")
        .args(&["run", "main.go"])
        .current_dir("../src-tauri/backend")
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .spawn()
        .expect("failed to start Go backend");

    // Espera a que el backend Go esté escuchando en el puerto 8080
    let max_retries = 30;
    let mut retries = 0;
    while TcpStream::connect("127.0.0.1:8080").is_err() && retries < max_retries {
        thread::sleep(time::Duration::from_millis(300));
        retries += 1;
    }

    if retries == max_retries {
        eprintln!("El backend Go no se pudo iniciar en el puerto 8080.");
        // Puedes decidir salir aquí si quieres:
        // std::process::exit(1);
    }

    tauri::Builder::default()
        // ... tu código Tauri aquí ...
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
