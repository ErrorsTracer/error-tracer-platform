use regex::Regex;
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::sync::OnceLock;

const SENSITIVE_KEYS: &[&str] = &[
    "authorization",
    "cookie",
    "password",
    "token",
    "accesstoken",
    "refreshtoken",
    "apikey",
    "xapikey",
    "secret",
];

pub fn sanitize(value: &mut Value) {
    match value {
        Value::Array(items) => items.iter_mut().for_each(sanitize),
        Value::Object(object) => {
            for (key, item) in object {
                let normalized: String = key
                    .chars()
                    .filter(|character| {
                        !matches!(character, '-' | '_' | ' ') && !character.is_whitespace()
                    })
                    .flat_map(char::to_lowercase)
                    .collect();
                if SENSITIVE_KEYS.contains(&normalized.as_str()) {
                    *item = Value::String("[Redacted]".into());
                } else {
                    sanitize(item);
                }
            }
        }
        _ => {}
    }
}

pub fn fingerprint(
    application_id: &str,
    environment: &str,
    name: Option<&str>,
    message: &str,
    stack: Option<&str>,
    framework: Option<&str>,
    runtime: Option<&str>,
) -> String {
    static FRAME: OnceLock<Regex> = OnceLock::new();
    static LOCATION: OnceLock<Regex> = OnceLock::new();
    let frame_pattern = FRAME.get_or_init(|| Regex::new(r":\d+:\d+\)?$").unwrap());
    let location_pattern = LOCATION.get_or_init(|| Regex::new(r":\d+:\d+\)?$").unwrap());
    let location = stack
        .and_then(|value| {
            value
                .lines()
                .map(str::trim)
                .find(|line| frame_pattern.is_match(line))
        })
        .map(|line| line.strip_prefix("at ").unwrap_or(line))
        .map(|line| {
            let inside = line
                .find('(')
                .and_then(|start| line.rfind(')').map(|end| &line[start + 1..end]))
                .unwrap_or(line);
            location_pattern.replace(inside, "").into_owned()
        });
    let normalize = |value: Option<&str>| {
        value
            .unwrap_or_default()
            .split_whitespace()
            .collect::<Vec<_>>()
            .join(" ")
            .to_lowercase()
    };
    let source = [
        normalize(Some(application_id)),
        normalize(Some(environment)),
        normalize(name),
        normalize(Some(message)),
        normalize(location.as_deref()),
        normalize(framework),
        normalize(runtime),
    ]
    .join("|");
    format!("{:x}", Sha256::digest(source.as_bytes()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn fingerprint_ignores_line_numbers() {
        let first = fingerprint(
            "app",
            "production",
            None,
            "Boom",
            Some("at run (/app/index.ts:10:2)"),
            None,
            Some("server"),
        );
        let second = fingerprint(
            "app",
            "production",
            None,
            "Boom",
            Some("at run (/app/index.ts:99:8)"),
            None,
            Some("server"),
        );
        assert_eq!(first, second);
    }

    #[test]
    fn recursively_redacts_secrets() {
        let mut value = json!({"headers": {"authorization": "secret"}, "password": "secret"});
        sanitize(&mut value);
        assert_eq!(
            value,
            json!({"headers": {"authorization": "[Redacted]"}, "password": "[Redacted]"})
        );
    }
}
