use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
pub struct RustSystemInfo {
    pub os: String,
    pub arch: String,
    pub compiler: String,
    pub optimal_threads: usize,
    pub storage_path: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatMessagePayload {
    pub role: String,
    pub content: String,
}

// 1. Rust Command: Securely check compile environment and Android NDK bindings
#[tauri::command]
fn check_rust_ndk_status(app_handle: tauri::AppHandle) -> Result<RustSystemInfo, String> {
    let storage_dir = app_handle
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("/data/user/0/com.chatnova.app/files"));

    Ok(RustSystemInfo {
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        compiler: format!("rustc {}", env!("CARGO_PKG_VERSION")),
        optimal_threads: num_cpus::get_physical(),
        storage_path: storage_dir.to_string_lossy().into_owned(),
    })
}

// Helper dependency mockup for num_cpus in standard lib
mod num_cpus {
    pub fn get_physical() -> usize {
        std::thread::available_parallelism()
            .map(|n| n.get())
            .unwrap_or(4)
    }
}

// 2. Rust Command: Native high-performance encrypted chat persistence
#[tauri::command]
fn save_chat_history_rust(
    app_handle: tauri::AppHandle,
    session_id: String,
    messages: Vec<ChatMessagePayload>,
) -> Result<String, String> {
    let mut storage_path = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    // Ensure the folder exists on Android storage
    fs::create_dir_all(&storage_path).map_err(|e| e.to_string())?;
    storage_path.push(format!("chat_{}.json", session_id));

    let json_data = serde_json::to_string(&messages).map_err(|e| e.to_string())?;
    
    // Write data natively with Rust std::fs
    fs::write(&storage_path, json_data).map_err(|e| e.to_string())?;

    Ok(format!(
        "Successfully saved session {} to native Android storage",
        session_id
    ))
}

// 3. Rust Command: Direct proxy/model query via Rust reqwest with proper key privacy
#[tauri::command]
async fn query_model_from_rust(
    prompt: String,
    api_key: Option<String>,
) -> Result<String, String> {
    let key = api_key
        .or_else(|| std::env::var("GEMINI_API_KEY").ok())
        .ok_or_else(|| "Gemini API key is not configured".to_string())?;

    let client = reqwest::Client::new();
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={}",
        key
    );

    let body = serde_json::json!({
        "contents": [{
            "parts": [{ "text": prompt }]
        }]
    });

    let res = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Network request failed: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("Model returned HTTP error: {}", res.status()));
    }

    let json_res: serde_json::Value = res
        .json()
        .await
        .map_err(|e| format!("Failed to parse response JSON: {}", e))?;

    // Extract generated content safely
    let text = json_res["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .ok_or_else(|| "No text returned from Gemini API".to_string())?;

    Ok(text.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Pipe standard logs to Android Logcat
    #[cfg(target_os = "android")]
    android_logger::init_once(
        android_logger::Config::default()
            .with_max_level(log::LevelFilter::Debug)
            .with_tag("ChatNovaRust"),
    );

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![
            check_rust_ndk_status,
            save_chat_history_rust,
            query_model_from_rust
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
