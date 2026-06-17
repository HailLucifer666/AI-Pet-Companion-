use tauri::Emitter;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use tauri_plugin_shell::ShellExt;
use xcap::Monitor;
use std::io::Cursor;
use image::ImageFormat;
use base64::{Engine as _, engine::general_purpose::STANDARD};

#[tauri::command]
async fn capture_screen() -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let monitors = Monitor::all().map_err(|e| e.to_string())?;
        let primary = monitors.into_iter().next().ok_or("No monitors found")?;
        let image = primary.capture_image().map_err(|e| e.to_string())?;
        let mut bytes: Vec<u8> = Vec::new();
        image.write_to(&mut Cursor::new(&mut bytes), ImageFormat::Png)
            .map_err(|e| e.to_string())?;
        Ok(format!("data:image/png;base64,{}", STANDARD.encode(bytes)))
    })
    .await
    .unwrap_or_else(|_| Err("Task panic".into()))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let ctrl_alt_s = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyS);

    tauri::Builder::default()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        if shortcut == &ctrl_alt_s {
                            let _ = app.emit("shortcut-pressed", ());
                        }
                    }
                })
                .build(),
        )
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![capture_screen])
        .setup(move |app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Register the shortcut
            let _ = app.global_shortcut().register(ctrl_alt_s);

            let sidecar_command = app
                .shell()
                .sidecar("neuraclaw-sidecar")
                .expect("failed to create sidecar command");
            let (mut rx, _child) = sidecar_command.spawn().expect("failed to spawn sidecar");

            tauri::async_runtime::spawn(async move {
                while let Some(event) = rx.recv().await {
                    match event {
                        tauri_plugin_shell::process::CommandEvent::Stdout(data) => {
                            println!("sidecar output: {}", String::from_utf8_lossy(&data));
                        }
                        tauri_plugin_shell::process::CommandEvent::Stderr(data) => {
                            eprintln!("sidecar error: {}", String::from_utf8_lossy(&data));
                        }
                        _ => {}
                    }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
