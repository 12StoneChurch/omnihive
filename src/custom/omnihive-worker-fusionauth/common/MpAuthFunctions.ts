import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";
import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";
import { User } from "@fusionauth/typescript-client";
import dayjs from "dayjs";
import { CreateAuthUser } from "@12stonechurch/omnihive-worker-common/models/CreateAuthUser";

export const MpLogin = async (username: string, password: string) => {
    const query = `query {
        SignIn(customArgs: {
            Data: "",
            UserName: "${username}",
            Password: "${password}"
        })
    }`;

    // Must set GraphService.graphRootUrl before this call.
    return (await AwaitHelper.execute(GraphService.getSingleton().runQuery(query))).SignIn;
};

export const MpVerifyEmailUnused = async (email: string) => {
    const query = `query {
        data: contacts_agg(emailAddress: "= '${email}'") {
            count(contactId: true)
        }
    }`;

    // Must set GraphService.graphRootUrl before this call.
    return (await AwaitHelper.execute(GraphService.getSingleton().runQuery(query))).data[0].count <= 0;
};

export const MpCreateUser = async (userData: CreateAuthUser) => {
    const query = `
        query {
            data: CreateUser(customArgs: {
                Email:  "${userData.email}",
                FirstName: "${userData.firstName}",
                LastName: "${userData.lastName}",
                Password: "${userData.password}",
                ${userData.mobilePhone ? `PhoneNumber: "${userData.mobilePhone}"` : ""},
            })
        }
    `;

    // Must set GraphService.graphRootUrl before this call.
    return (await AwaitHelper.execute(GraphService.getSingleton().runQuery(query))).data;
};

export const buildAuthUser = async (mpAuthModel: any, authTenantId: string): Promise<User> => {
    const query = `query {
        contacts(contactId: "= ${mpAuthModel.ContactId}") { 
            birthDate: dateOfBirth
            email: emailAddress
            firstName: firstName
            nickname: nickname
            lastName: lastName
            middleName: middleName
            mobilePhone: mobilePhone
            userId: userAccount
        }
    }`;

    // Must set GraphService.graphRootUrl before this call.
    const mpContact = (await AwaitHelper.execute(GraphService.getSingleton().runQuery(query))).contacts[0];

    const roles: any = {};
    mpAuthModel.RoleList.map((x: any) => (roles[x.Name] = x.Value));

    const cmsRoles: any = {};
    mpAuthModel.CmsRoles.map(
        (x: any) =>
            (cmsRoles[`${x.SiteName}-${x.RoleName}`] = {
                roleId: x.RoleId,
                siteId: x.SiteId,
                userRoleId: x.UserRoleId,
            })
    );
    const authMetadata = {
        syncedFromMp: true,
        mpContactId: mpAuthModel.ContactId,
        mpUserId: mpContact.userId,
        roles: roles,
        cmsRoles: cmsRoles,
    };

    return {
        active: true,
        birthDate: mpContact.birthDate
            ? dayjs(mpContact.birthDate)
                  .subtract(dayjs(mpContact.birthDate).utcOffset(), "minutes")
                  .format("YYYY-MM-DD")
            : undefined,
        data: authMetadata,
        email: mpContact.email,
        firstName: mpContact.firstName,
        fullName: `${mpContact.nickname} ${mpContact.lastName}`,
        lastName: mpContact.lastName,
        middleName: mpContact.middleName,
        mobilePhone: mpContact.mobilePhone,
        tenantId: authTenantId,
        username: mpContact.email,
    };
};
