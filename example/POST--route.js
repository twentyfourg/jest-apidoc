/**
  @api {POST} /users POST user
  @apiName POST user
  @apiGroup user

  @apiParam {string} firstName
  @apiParam {string} lastName
  @apiParam {object} profileImage

  @apiSuccessExample Success-Response:
  HTTP/1.1 200
  {
    "jwt": 123,
    "user": {
        "id": 1,
        "firstName": "Kyle",
        "lastName": "Richardson",
        "profileImage": "https://i.kym-cdn.com/entries/icons/facebook/000/018/012/this_is_fine.jpg",
    }
}
*/
