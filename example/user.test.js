describe("user.routes.js", () => {
  describe("POST /users", () => {
    test("creates user", async () => {
      const params = {
        firstName: "Kyle",
        lastName: "Richardson",
        profileImage:
          "https://i.kym-cdn.com/entries/icons/facebook/000/018/012/this_is_fine.jpg",
      };

      const response = await apiRequest("POST", "/users", params);

      expect(response.status).toBe(200);
      expect(response.jwt).toBe(123);
      expect(response.user).toBeTruthy();
    });
  });
});
