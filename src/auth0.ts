import { FastifyRequest} from "fastify";
import fetch from "node-fetch";

let moduleAdminToken: string;

async function getAdminToken(refresh : boolean) {
  if(refresh || !moduleAdminToken) {
    let mgmtDomain = process.env.AUTH0_DOMAIN;

    let refreshResponse = await fetch(`https://${process.env.AUTH0_DOMAIN}/oauth/token`, {
      "method": "post",
      "headers": {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "grant_type": "client_credentials",
        "client_id": process.env.AUTH0_MGMT_CLIENT_ID,
        "client_secret": process.env.AUTH0_MGMT_CLIENT_SECRET,
        "audience": `https://${mgmtDomain}/api/v2/`,
        "scope": "read:users update:users read:users_app_metadata update:users_app_metadata"
      })
    });
    let refreshJson = await refreshResponse.json();
    moduleAdminToken = refreshJson.access_token
  }
  return moduleAdminToken;
}

export interface Auth0UserInfo {
  user_id: string, // Should be URL encoded since it may contain characters that do not work well in a URL.
  username?: string,
  email?: string
  email_verified?: boolean,
  phone_number?: string
  phone_verified?: boolean,
  created_at?: string,
  updated_at?: string,
  identities?: [
    {
      connection?: string,
      user_id: string,
      provider: string,
      isSocial?: boolean
    }
  ],
  app_metadata?: any,
  user_metadata?: any,
  picture?: string,
  name?: string,
  nickname?: string,
  multifactor?: string[],
  last_ip?: string,
  last_login?: string,
  logins_count?: number,
  blocked?: boolean,
  given_name?: string,
  family_name?: string
}

export interface UserInfoPatch {
  blocked?: boolean,
  email_verified?: boolean,
  email?: string,
  phone_number?: string,
  phone_verified?: boolean,
  user_metadata?: any,
  app_metadata?: any,
  given_name?: string,
  family_name?: string,
  name?: string,
  nickname?: string,
  picture?: string,
  verify_email?: boolean,
  verify_phone_number?: boolean,
  password?: string,
  connection?: string,
  client_id?: string,
  username?: string
}

async function getUserRole(userId: string) : Promise<{role:string}> {
  let app_metadata = (await getUserById(userId)).app_metadata;
  return {role: app_metadata.role};
}

/*
  Get user by ID: https://auth0.com/docs/api/management/v2#!/Users/get_users_by_id
  Get all users: https://auth0.com/docs/api/management/v2#!/Users/get_users
  Update a user: https://auth0.com/docs/api/management/v2#!/Users/patch_users_by_id
 */

export async function getUserById(userId: string) : Promise<Auth0UserInfo> {
  userId = userId.startsWith("auth0|") ? userId : `auth0|${userId}`;
  return callManagementApi<Auth0UserInfo>(`/users/${userId}`);
}

export async function getAllUsers(per_page? : number, page?: number) {
  let querystring = "";
  if(!!per_page || !!page) {
    querystring = "?";
    let perPageClause = !per_page ? "" : `per_page=${per_page}`
    let pageClause = !page ? "" : `page=${page}`;
    querystring = `?${perPageClause}&${pageClause}`;
  }
  return callManagementApi<Auth0UserInfo[]>(`/users${querystring}`);
}

export async function updateUser(userId: string, userInfoPatch: UserInfoPatch) {
  userId = userId.startsWith("auth0|") ? userId : `auth0|${userId}`;
  return callManagementApi<Auth0UserInfo>(`/users/${userId}`, "PATCH", JSON.stringify(userInfoPatch));
}

async function callManagementApi<T>(path: string, method = "GET", body = "", refresh = false) : Promise<T> {
  let mgmtDomain = process.env.AUTH0_DOMAIN;
  let adminToken = await getAdminToken(refresh);
  let url = encodeURI(`https://${mgmtDomain}/api/v2${path}`);
  let options : any = {
    method,
    "headers": {
      "Authorization": `Bearer ${adminToken}`
    }
  };
  if(!!body) {
    options.headers["Content-Type"] = "application/json";
    options.body = body;
  }
  let metaResponse = await fetch(url, options);
  if(metaResponse.status === 200) {
    let json = await metaResponse.json()
    return json;
  } else if (!refresh && metaResponse.status === 401) {
    return await callManagementApi<T>(path, method, body,true);
  } else {
    throw new Error(JSON.stringify(metaResponse));
  }
}


export async function getUserInfo(authHeader: string) {
  try {
    let userResponse = await fetch(`https://${process.env.AUTH0_DOMAIN}/userinfo`, {
      "method": "GET",
      "headers": {"Authorization": authHeader}
    });
    let payload: any = await userResponse.json();
    let userId : string = !payload.sub ? "" : payload.sub;
    return {userId};
  } catch (e) {
    throw e;
  }
}

export type Auth0JwtVerifier = (request: FastifyRequest) => Promise<{userAppId: string, admin: boolean, role: string}>;
export async function verifyJwt(request: FastifyRequest) {
  let authHeader = !request.headers.authorization ? "" : request.headers.authorization
  if(!authHeader) {
    return {userAppId: "", admin: false, role: ""};
  } else {
    let {userId} = await getUserInfo(authHeader);
    let {role} = await getUserRole(userId);
    let admin: boolean = role === "admin"
    let userAppId = userId.indexOf("|") > 0 ? userId.split("|")[1] : userId;
    return {userAppId, admin, role};
  }
}
