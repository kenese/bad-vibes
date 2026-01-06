declare module "oauth-1.0a" {
  interface OAuthOptions {
    consumer: {
      key: string;
      secret: string;
    };
    signature_method?: string;
    hash_function?: (base_string: string, key: string) => string;
    nonce_length?: number;
    version?: string;
    parameter_seperator?: string;
    realm?: string;
    last_ampersand?: boolean;
  }

  interface Token {
    key: string;
    secret: string;
  }

  interface RequestOptions {
    url: string;
    method: string;
    data?: unknown;
    includeBodyHash?: boolean;
  }

  interface Header {
    Authorization: string;
  }

  interface AuthorizedData {
    oauth_consumer_key: string;
    oauth_nonce: string;
    oauth_signature: string;
    oauth_signature_method: string;
    oauth_timestamp: number;
    oauth_token?: string;
    oauth_version: string;
    [key: string]: unknown;
  }

  export default class OAuth {
    constructor(opts: OAuthOptions);
    authorize(request: RequestOptions, token?: Token): AuthorizedData;
    toHeader(oauthData: AuthorizedData): Header;
  }
}
