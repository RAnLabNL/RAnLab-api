import {getUserById, getUserIdFromAuth0} from "./dependencies/auth0Api";
import {DataLayer} from "./database/productionDataLayer";

export const LIFETIME_MILLISECONDS =  1000 * 60 * 30; // half an hour
export type MinimalRequest = { headers?: {authorization?: string }};
export type Auth0JwtVerifier = (request: MinimalRequest) => Promise<UserAuthEntry>;
export type UserAuthEntry = {userAppId: string, admin: boolean, role: string};

export function getJwtVerifier(cache: DataLayer, getUserInfo = getUserIdFromAuth0, getUserRole = getUserRoleFromAuth0 ) : Auth0JwtVerifier {
  return (request : MinimalRequest) => verifyJwt(request, cache, getUserInfo, getUserRole);
}

async function getUserRoleFromAuth0(userId: string) : Promise<string> {
  let app_metadata = (await getUserById(userId)).app_metadata;
  return app_metadata.role;
}

function getCacheKey(authHeader: string) {
  return authHeader.split(" ")[1].substr(0, 100);
}

async function verifyJwtCached(cacheKey: string, cache: DataLayer) {
  if(!cacheKey) {
    return null;
  } else {
    let cachedData = await cache.getUserInfo(cacheKey);
    if (!!cachedData) {
      return cachedData;
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

async function verifyJwt(request: MinimalRequest, userCache: DataLayer, getUserInfo: (token: string) => Promise<string>, getUserRole: (userId: string) => Promise<string>) {
  let authHeader = !!request.headers && !!request.headers.authorization ? request.headers.authorization : "";
  if (!authHeader) {
    return {userAppId: null, role: null, admin: false}
  } else {
    let cacheKey = getCacheKey(authHeader);
    let userData =  await verifyJwtCached(cacheKey, userCache);
    if(!userData) {
      userData = await verifyJwtFromAuth0(authHeader, getUserInfo, getUserRole)
      await userCache.setUserInfo(cacheKey, userData);
    }
    return userData;
  }
}
