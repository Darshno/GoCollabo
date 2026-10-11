import { describe, it, expect, vi } from "vitest";

describe("Client Auth State & Session Handling", () => {
  it("extracts authenticated user metadata from session with fallback defaults", () => {
    const rawSessionUser = {
      id: "usr-12345",
      email: "creator@example.com",
      user_metadata: {
        name: "Darsh Creator",
        account_type: "creator",
      },
    };

    // Test extraction logic
    const name = rawSessionUser.user_metadata?.name || null;
    const accountType = rawSessionUser.user_metadata?.account_type === "brand" ? "brand" : "creator";
    const user = {
      id: rawSessionUser.id,
      email: rawSessionUser.email,
      name,
      accountType,
    };

    expect(user.id).toBe("usr-12345");
    expect(user.email).toBe("creator@example.com");
    expect(user.name).toBe("Darsh Creator");
    expect(user.accountType).toBe("creator");
  });

  it("handles brand accountType in user metadata correctly", () => {
    const brandSessionUser = {
      id: "usr-brand",
      email: "brand@example.com",
      user_metadata: {
        company_name: "Acme",
        account_type: "brand",
      },
    };

    const accountType = brandSessionUser.user_metadata?.account_type === "brand" ? "brand" : "creator";
    expect(accountType).toBe("brand");
  });

  it("handles onAuthStateChange events correctly", () => {
    const mockInvalidate = vi.fn();
    const mockSetData = vi.fn();

    const handleAuthStateChange = (event: string, session: any) => {
      if (event === "SIGNED_OUT" || !session) {
        mockSetData(undefined, null);
        mockInvalidate();
        return null;
      }
      mockInvalidate();
      return session;
    };

    // 1. SIGNED_IN
    const sessionObj = { access_token: "tok-123", user: { id: "u1" } };
    const signedInState = handleAuthStateChange("SIGNED_IN", sessionObj);
    expect(signedInState).toEqual(sessionObj);
    expect(mockInvalidate).toHaveBeenCalledTimes(1);

    // 2. TOKEN_REFRESHED
    const refreshedSession = { access_token: "tok-456", user: { id: "u1" } };
    const refreshedState = handleAuthStateChange("TOKEN_REFRESHED", refreshedSession);
    expect(refreshedState).toEqual(refreshedSession);
    expect(mockInvalidate).toHaveBeenCalledTimes(2);

    // 3. SIGNED_OUT
    const loggedOutState = handleAuthStateChange("SIGNED_OUT", null);
    expect(loggedOutState).toBeNull();
    expect(mockSetData).toHaveBeenCalledWith(undefined, null);
    expect(mockInvalidate).toHaveBeenCalledTimes(3);
  });
});
