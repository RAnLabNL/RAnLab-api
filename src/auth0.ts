import {getUserById, getUserIdFromAuth0} from "./dependencies/auth0Api";
import {Memcached, ResponseCode} from "memcached-node";

export const LIFETIME_SECONDS =  60 * 30; // half an hour
export type MinimalRequest = { headers?: {authorization?: string }};
export type Auth0JwtVerifier = (request: MinimalRequest) => Promise<UserAuthEntry>;
export type UserAuthEntry = {userAppId: string, admin: boolean, role: string};

export function getJwtVerifier(cache: Memcached, getUserInfo = getUserIdFromAuth0, getUserRole = getUserRoleFromAuth0 ) : Auth0JwtVerifier {
  return (request : MinimalRequest) => verifyJwt(request, cache, getUserInfo, getUserRole);
}

async function getUserRoleFromAuth0(userId: string) : Promise<string> {
  let app_metadata = (await getUserById(userId)).app_metadata;
  return app_metadata.role;
}

async function verifyJwtCached(authHeader: string, cache: Memcached) {
  if(!authHeader) {
    return null;
  } else {
    let cachedData = await cache.get(authHeader);
    if (cachedData.code === ResponseCode.EXISTS && !!cachedData.data) {
      let headerMetadata = cachedData.data[authHeader];
      if (!!headerMetadata && !!headerMetadata.value) {
        return JSON.parse(headerMetadata.value.toString());
      } else {
        return null;
      }
    } else {
      return null;
    }
  }
}

async function verifyJwtFromAuth0(authHeader: string, getUserInfo: (token: string) => Promise<string>, getUserRole: (id: string) => Promise<string>) {
  let userId = await getUserInfo(authHeader);
  let role = await getUserRole(userId);
  let admin: boolean = role === "admin"
  let userAppId = userId.indexOf("|") > 0 ? userId.split("|")[1] : userId;
  return {userAppId, admin, role};
}

async function verifyJwt(request: MinimalRequest, userCache: Memcached, getUserInfo: (token: string) => Promise<string>, getUserRole: (userId: string) => Promise<string>) {
  let authHeader = !!request.headers && !!request.headers.authorization ? request.headers.authorization : "";
  let userData =  await verifyJwtCached(authHeader, userCache);
  if(!userData) {
    userData = await verifyJwtFromAuth0(authHeader, getUserInfo, getUserRole)
    await userCache.add(authHeader, userData, {expires: LIFETIME_SECONDS});
  }
  return userData;
}
