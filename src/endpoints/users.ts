import {FastifyInstance} from "fastify";
import {Auth0JwtVerifier, Auth0UserInfo, getAllUsers, getUserById, updateUser, UserInfoPatch} from "../auth0";
import {AuthenticatedRequest, AuthenticatedRequestById} from "./endpointUtils";
import {getAllUsersRequestSchema, getUserInfoRequestSchema, updateUserRequestSchema} from "./docs/userSchema";

interface GetPaginatedUsersRequest extends AuthenticatedRequest {
  Querystring: {
    per_page?: number,
    page?: number
  }
}

interface UpdateUserRequest extends AuthenticatedRequestById {
  Body: UserInfoPatch
}

export default function createUsersEndpoint(app: FastifyInstance, verifyJwt: Auth0JwtVerifier) {
  app.get<AuthenticatedRequestById>(
    '/users/:id',
    {schema: getUserInfoRequestSchema},
    async (request, reply) => {
      let {userAppId, admin, role} = await verifyJwt(request);
      if (!userAppId) {
        reply.unauthorized("Only authenticated users can access this information");
        return;
      } else {
        let response = {
          status: "ok",
          date: Date.now(),
          userInfo: <Auth0UserInfo>{}
        };
        if (admin || role == "region") {
          response.userInfo = await getUserById(userAppId);
        }
        return JSON.stringify(response);
      }
    }
  );

  app.get<GetPaginatedUsersRequest>(
    '/users',
    {schema: getAllUsersRequestSchema},
    async (request, reply) => {
      let {userAppId} = await verifyJwt(request);
      if (!userAppId) {
        reply.unauthorized("Only authenticated users can access this information");
        return;
      } else {
        let response = {
          status: "ok",
          date: Date.now(),
          users: <Auth0UserInfo[]>[]
        };
        response.users = await getAllUsers(request.query.per_page, request.query.page);
        return JSON.stringify(response);
      }
    }
  );

  app.post<UpdateUserRequest>(
    '/users/:id',
    {schema: updateUserRequestSchema},
    async (request, reply) => {
      let {admin} = await verifyJwt(request);
      if (!admin) {
        reply.unauthorized("Only system administrators can update user information");
        return;
      } else {
        let response = {
          status: "ok",
          date: Date.now(),
          user: <Auth0UserInfo>{}
        };
        response.user = await updateUser(request.params.id, request.body);
        return JSON.stringify(response);
      }
    }
  );

  return app;
}
