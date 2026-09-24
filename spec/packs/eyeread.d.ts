// Type declarations for the eyeread.in packs API, apiVersion 1.
// See API.md for behaviour. This file declares the global `eyeread` that the
// app's sandbox installs before a pack's `main` module runs.

export {};

declare global {
  namespace Eyeread {
    type Permission =
      | 'scripts:write'
      | 'prompter:load'
      | 'prompter:control'
      | 'prompter:events'
      | 'files:import';

    type ErrorCode =
      | 'E_PERMISSION'
      | 'E_NETWORK_DENIED'
      | 'E_NETWORK'
      | 'E_TIMEOUT'
      | 'E_TOO_LARGE'
      | 'E_RATE_LIMITED'
      | 'E_INVALID_ARGUMENT'
      | 'E_NO_SESSION'
      | 'E_BUSY'
      | 'E_UNSUPPORTED'
      | 'E_INTERNAL';

    interface EyereadError extends Error {
      readonly code: ErrorCode;
    }

    type Unsubscribe = () => void;
    type SettingValue = boolean | number | string;
    type Settings = Readonly<Record<string, SettingValue>>;

    interface SettingsApi {
      /** All declared settings, with defaults filled in. */
      get(): Promise<Settings>;
      /** Called after the user changes any setting. */
      onChange(callback: (values: Settings) => void): Unsubscribe;
    }

    interface ScriptInput {
      /** Required, non-empty, up to 1 MiB. */
      text: string;
      /** Up to 200 characters. Defaults to the pack's name. */
      title?: string;
      /** BCP-47 tag for voice tracking, such as `en-US`. */
      language?: string;
    }

    interface ScriptsApi {
      add(script: ScriptInput): Promise<{ scriptId: string }>;
    }

    interface PrompterLoadApi {
      load(script: ScriptInput): Promise<{ scriptId: string }>;
    }

    interface PrompterControlApi {
      play(): Promise<void>;
      pause(): Promise<void>;
      toggle(): Promise<void>;
      restart(): Promise<void>;
      /** Clamped to the script. */
      seek(wordIndex: number): Promise<void>;
      close(): Promise<void>;
    }

    interface PrompterState {
      sessionActive: boolean;
      playing: boolean;
      scriptId: string | null;
      title: string | null;
      wordIndex: number;
      wordCount: number;
    }

    interface PrompterEventsApi {
      getState(): Promise<PrompterState>;
      /** Called with the current state, then on every change (about 150 ms apart at most). */
      onState(callback: (state: PrompterState) => void): Unsubscribe;
    }

    interface ImportOptions {
      /** Extensions to offer, such as `['.txt', '.md']`. Up to 16. */
      accept?: string[];
      /** At most, and by default, 10 MiB. */
      maxBytes?: number;
    }

    interface ImportedFile {
      readonly name: string;
      readonly type: string;
      readonly size: number;
      text(): Promise<string>;
      bytes(): Promise<Uint8Array>;
    }

    interface FilesApi {
      /** Resolves with `null` if the user cancels. */
      import(options?: ImportOptions): Promise<ImportedFile | null>;
    }

    type HttpMethod = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

    interface NetRequestInit {
      method?: HttpMethod;
      headers?: Record<string, string>;
      body?: string | Uint8Array | ArrayBuffer;
      /** Default 15 000, at most 30 000. */
      timeoutMs?: number;
    }

    interface NetResponse {
      readonly ok: boolean;
      readonly status: number;
      readonly url: string;
      /** Lowercase keys. `set-cookie` is removed. */
      readonly headers: Readonly<Record<string, string>>;
      text(): Promise<string>;
      json<T = unknown>(): Promise<T>;
      bytes(): Promise<Uint8Array>;
    }

    interface NetApi {
      fetch(url: string, init?: NetRequestInit): Promise<NetResponse>;
    }

    interface BaseContext {
      settings: SettingsApi;
      /** Present only when the permission declares `network` in pack.json. */
      net?: NetApi;
    }

    interface ContextMap {
      'scripts:write': BaseContext & { scripts: ScriptsApi };
      'prompter:load': BaseContext & { prompter: PrompterLoadApi };
      'prompter:control': BaseContext & { prompter: PrompterControlApi };
      'prompter:events': BaseContext & { prompter: PrompterEventsApi };
      'files:import': BaseContext & { files: FilesApi };
    }

    type Handler<P extends Permission> = (context: ContextMap[P]) => void | Promise<void>;

    interface Api {
      readonly apiVersion: 1;
      readonly pack: Readonly<{ id: string; version: string; name: string }>;
      /** Register during the module's first evaluation. Called once, if the permission is allowed. */
      on<P extends Permission>(permission: P, handler: Handler<P>): void;
      readonly settings: SettingsApi;
      /** Present only in a sandbox whose permission declares `network`. */
      readonly net?: NetApi;
    }
  }

  const eyeread: Eyeread.Api;
}
