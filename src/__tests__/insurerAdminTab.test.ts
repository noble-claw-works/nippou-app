// B3: 管理画面「保険会社」タブの表示権限 / InsurerSelect の選択
import { describe, it, expect, beforeEach } from "vitest";
import { createElement } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AdminPage } from "../pages/AdminPage";
import { InsurerSelect } from "../components/common/InsurerSelect";
import { useAppStore } from "../store";

const renderAdmin = () =>
  render(createElement(MemoryRouter, null, createElement(AdminPage)));

describe("管理画面 保険会社タブ", () => {
  beforeEach(() => {
    useAppStore.setState({ currentRole: "admin" });
  });
  it("システム管理者には表示される", () => {
    renderAdmin();
    expect(screen.getByText("🏦 保険会社")).toBeTruthy();
    fireEvent.click(screen.getByText("🏦 保険会社"));
    expect(screen.getByTestId("insurance-companies-tab")).toBeTruthy();
  });
  it("経営者・管理職には表示されない", () => {
    for (const role of ["executive", "manager"] as const) {
      useAppStore.setState({ currentRole: role });
      const { unmount } = renderAdmin();
      expect(screen.queryByText("🏦 保険会社")).toBeNull();
      unmount();
    }
  });
});

describe("InsurerSelect", () => {
  it("選択すると name と id が渡る / マスタ外は据え置き表示", () => {
    const calls: Array<{ insurer: string; insurerId?: string }> = [];
    const { unmount } = render(
      createElement(InsurerSelect, { insurer: "", onChange: (v: { insurer: string; insurerId?: string }) => calls.push(v) }),
    );
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "ic_01" } });
    expect(calls[0]).toEqual({ insurer: "日本生命保険", insurerId: "ic_01" });
    unmount();
    render(createElement(InsurerSelect, { insurer: "謎保険", onChange: () => {} }));
    expect(screen.getByText("（マスタ外）謎保険")).toBeTruthy();
  });
});
