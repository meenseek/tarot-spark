export type CopyState = "idle" | "copied" | "failed";

export type ShareFeedback = {
  readonly method: "kakaotalk" | "native" | "copy_url" | "instagram_image";
  readonly status:
    | "opened"
    | "shared"
    | "copied"
    | "download_started"
    | "failed";
};

export type InstagramImageStatus = "idle" | "loading" | "ready" | "failed";
