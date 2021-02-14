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
        "audience": `https://${mgmtDomain}/api/v2/`
      })
    });
    let refreshJson = await refreshResponse.json();
    moduleAdminToken = refreshJson.access_token
  }
  return moduleAdminToken;
}

async function getUserRole(userId: string, refresh = false) : Promise<{role: string}> {
  let mgmtDomain = process.env.AUTH0_DOMAIN;
  let adminToken = await getAdminToken(refresh);
  let url = `https://${mgmtDomain}/api/v2/users/${userId.replace("|", "%7C")}`;
  let metaResponse = await fetch(url, {
    "headers": {
      "Authorization": `Bearer ${adminToken}`,
    }
  });
  if(metaResponse.status === 200) {
    let metadata = await metaResponse.json();
    return {role: metadata.app_metadata.role};
  } else if (!refresh && metaResponse.status === 401) {
    return await getUserRole(userId, true);
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

export type Auth0JwtVerifier = (request: FastifyRequest) => Promise<{userAppId: string, admin: boolean}>;

export async function verifyJwt(request: FastifyRequest) {
  let authHeader = !request.headers.authorization ? "" : request.headers.authorization
  if(!authHeader) {
    return {userAppId: "", admin: false};
  } else {
    let {userId} = await getUserInfo(authHeader);
    let {role} = await getUserRole(userId);
    let admin: boolean = role === "admin"
    let userAppId = userId.indexOf("|") > 0 ? userId.split("|")[1] : userId;
    return {userAppId, admin};
  }
}
