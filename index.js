const fs = require("fs");
const { outFolder, ignoreRoutes } = require("../../jest-apidoc.json");

// prettier-ignore
const baseSuccessfulExample =
`@apiSuccessExample Success-Response:
  HTTP/1.1 {{status}}{{response}}`;

// prettier-ignore
const baseErrorExample =
`@apiErrorExample {json} Error-Response:
  HTTP/1.1 {{status}}{{response}}`;

// prettier-ignore
const baseApiDoc =
`/**
  @api {{{method}}} {{route}} {{routeTitle}}
  @apiName {{apiName}}
  @apiGroup {{apiGroup}}
{{params}}
  {{successResponses}}{{errorResponses}}*/
`;

/**
 * current test name to be structured like "admin-session.routes PUT /admin/vendors/:vendorId updates and returns vendor"
 * parse out PUT /admin/vendors/:vendorId
 */
const getDocNameFromTestName = (currentTestName) => {
  const parts = currentTestName.split(" ");
  return `${parts[2]}`;
};

const getGroupNameFromTestName = (currentTestName) => {
  const parts = currentTestName.split(" ");
  return parts[0].replace(".routes", "").replace("-", " ");
};

const getParamType = (paramValue) => {
  if (Array.isArray(paramValue) && paramValue.length > 0) {
    return `${typeof paramValue[0]}[]`;
  }

  if (paramValue && paramValue.constructor) {
    const { name } = paramValue.constructor;
    return name.toLowerCase();
  }

  return typeof paramValue;
};

const createParams = (params) => {
  const paramsKeys = Object.keys(params);

  if (paramsKeys.length === 0) {
    return "";
  }

  let paramString = "";

  paramsKeys.forEach((key) => {
    const paramType = getParamType(params[key]);
    paramString += `  @apiParam {${paramType}} ${key}\n`;
  });

  return `\n${paramString}`;
};

const createResponse = (response) => {
  if (!response) {
    return "";
  }

  delete response.status;
  const jsonResponse = JSON.stringify(response, null, 2);
  return `\n  ${jsonResponse}\n`;
};

const getRouteToWrite = (currentTestName) => {
  const parts = currentTestName.split(" ");
  return `${parts[1]} ${parts[2]}`;
};

/**
 * apiCalls: {
 *  [route]: {
 *    [method]: {
 *      docName,
 *      apiGroup,
 *      apiName,
 *      routeTitle,
 *      lastDescribeName,
 *      lastTestName,
 *      params: {},
 *      statuses: {
 *        [status]: {
 *          response: {},
 *        }
 *      },
 *    },
 *  },
 * }
 */
const apiCalls = {};

const populateUndefined = ({ method, route, status }) => {
  if (!apiCalls[route]) {
    apiCalls[route] = {};
  }

  if (!apiCalls[route][method]) {
    apiCalls[route][method] = {
      params: {},
      statuses: {},
    };
    apiCalls[route][method].statuses = {};
  }

  if (!apiCalls[route][method].statuses[status]) {
    apiCalls[route][method].statuses[status] = {
      response: {},
    };
  }
};

const setApiResponse = ({ method, params, status, response }) => {
  const jestState = expect.getState();

  const { currentTestName } = jestState;
  const apiGroup = getGroupNameFromTestName(currentTestName);
  const apiName = `${method.toUpperCase()} ${apiGroup}`;
  const routeToWrite = getRouteToWrite(currentTestName);

  if (!ignoreRoutes.includes(routeToWrite)) {
    populateUndefined({ method, route: routeToWrite, status });

    const { params: currentParams } = apiCalls[routeToWrite][method];
    const { response: currentResponse } = apiCalls[routeToWrite][
      method
    ].statuses[status];

    const paramsToWrite =
      currentParams &&
      Object.keys(currentParams).length > Object.keys(params).length
        ? currentParams
        : params;
    const responseToWrite =
      currentResponse &&
      Object.keys(currentResponse).length > Object.keys(response).length
        ? currentResponse
        : response;

    // @todo check response size too

    apiCalls[routeToWrite][method] = {
      docName: getDocNameFromTestName(currentTestName),
      apiGroup,
      apiName,
      routeTitle: apiName,
      params: paramsToWrite,
      statuses: {
        ...apiCalls[routeToWrite][method].statuses,
        [status]: {
          response: responseToWrite,
        },
      },
    };
  }
};

const writeApiDoc = () => {
  // Create apidoc if non-existent
  if (!fs.existsSync(outFolder)) {
    fs.mkdirSync(outFolder);
  }

  const routes = Object.keys(apiCalls);

  routes.forEach((apiRoute) => {
    const methods = Object.keys(apiCalls[apiRoute]);
    methods.forEach((apiMethod) => {
      const { docName, apiGroup, apiName, routeTitle, params } = apiCalls[
        apiRoute
      ][apiMethod];

      const statuses = Object.keys(apiCalls[apiRoute][apiMethod].statuses);

      const successResponseDocs = [];
      const errorResponseDocs = [];
      const paramsString = createParams(params);

      statuses.forEach((apiStatus) => {
        const { response } = apiCalls[apiRoute][apiMethod].statuses[apiStatus];

        const responseString = createResponse(response);

        if (apiStatus < 400) {
          successResponseDocs.push(
            baseSuccessfulExample
              .replace(/{{status}}/g, apiStatus)
              .replace(/{{response}}/g, responseString)
          );
        } else {
          errorResponseDocs.push(
            baseErrorExample
              .replace(/{{status}}/g, apiStatus)
              .replace(/{{response}}/g, responseString)
          );
        }
      });

      const apiDoc = baseApiDoc
        .replace(/{{routeTitle}}/g, routeTitle)
        .replace(/{{params}}/g, paramsString)
        .replace(/{{apiName}}/g, apiName)
        .replace(/{{apiGroup}}/g, apiGroup)
        .replace(/{{method}}/g, apiMethod.toUpperCase())
        .replace(/{{route}}/g, docName)
        .replace(/{{successResponses}}/g, successResponseDocs.join("\n"))
        .replace(/{{errorResponses}}/g, errorResponseDocs.join("\n"));

      const path = (docName.charAt(0) === "/" ? docName : `/${docName}`)
        .replace(/\//g, "-")
        .replace(/:/g, "");

      fs.writeFileSync(
        `${outFolder}/${apiMethod.toUpperCase()}-${path}.js`,
        apiDoc
      );
    });
  });
};

module.exports = {
  setApiResponse,
  writeApiDoc,
};
