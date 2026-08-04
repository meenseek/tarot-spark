export type CopyState = "idle" | "copied" | "failed";

export type ShareState = "idle" | "shared" | "copied" | "failed";

export type KakaoShareState = "idle" | "opened" | "failed";

export type ShareFeedback = {
  readonly method:
    | "kakaotalk"
    | "native"
    | "clipboard"
    | "copy_url"
    | "instagram_copy_url";
  readonly status: "opened" | "shared" | "copied" | "failed";
};
