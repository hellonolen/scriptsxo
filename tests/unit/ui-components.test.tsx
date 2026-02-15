import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ---------- Button ----------

describe("Button", () => {
  it("renders children text", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("renders as a button element", () => {
    render(<Button>Submit</Button>);
    expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
  });

  it("handles onClick events", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByText("Click"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("supports disabled state", () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole("button", { name: "Disabled" });
    expect(button).toBeDisabled();
  });

  it("does not fire onClick when disabled", () => {
    const handleClick = vi.fn();
    render(
      <Button disabled onClick={handleClick}>
        No Click
      </Button>
    );
    fireEvent.click(screen.getByText("No Click"));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("applies default variant classes", () => {
    render(<Button>Default</Button>);
    const button = screen.getByRole("button", { name: "Default" });
    expect(button.className).toContain("bg-foreground");
    expect(button.className).toContain("text-background");
  });

  it("applies secondary variant classes", () => {
    render(<Button variant="secondary">Secondary</Button>);
    const button = screen.getByRole("button", { name: "Secondary" });
    expect(button.className).toContain("bg-transparent");
    expect(button.className).toContain("border");
  });

  it("applies outline variant classes", () => {
    render(<Button variant="outline">Outline</Button>);
    const button = screen.getByRole("button", { name: "Outline" });
    expect(button.className).toContain("bg-transparent");
    expect(button.className).toContain("border");
  });

  it("applies ghost variant classes", () => {
    render(<Button variant="ghost">Ghost</Button>);
    const button = screen.getByRole("button", { name: "Ghost" });
    expect(button.className).toContain("bg-transparent");
    expect(button.className).toContain("text-muted-foreground");
  });

  it("applies destructive variant classes", () => {
    render(<Button variant="destructive">Delete</Button>);
    const button = screen.getByRole("button", { name: "Delete" });
    expect(button.className).toContain("text-destructive");
  });

  it("applies default size classes", () => {
    render(<Button>Sized</Button>);
    const button = screen.getByRole("button", { name: "Sized" });
    expect(button.className).toContain("h-11");
    expect(button.className).toContain("px-7");
  });

  it("applies sm size classes", () => {
    render(<Button size="sm">Small</Button>);
    const button = screen.getByRole("button", { name: "Small" });
    expect(button.className).toContain("h-9");
    expect(button.className).toContain("px-5");
  });

  it("applies lg size classes", () => {
    render(<Button size="lg">Large</Button>);
    const button = screen.getByRole("button", { name: "Large" });
    expect(button.className).toContain("h-14");
    expect(button.className).toContain("px-10");
  });

  it("applies icon size classes", () => {
    render(<Button size="icon">X</Button>);
    const button = screen.getByRole("button", { name: "X" });
    expect(button.className).toContain("h-10");
    expect(button.className).toContain("w-10");
  });

  it("merges custom className", () => {
    render(<Button className="my-custom-class">Custom</Button>);
    const button = screen.getByRole("button", { name: "Custom" });
    expect(button.className).toContain("my-custom-class");
  });

  it("passes through additional HTML attributes", () => {
    render(
      <Button type="submit" data-testid="submit-btn">
        Submit
      </Button>
    );
    const button = screen.getByTestId("submit-btn");
    expect(button).toHaveAttribute("type", "submit");
  });

  it("forwards ref to the button element", () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Ref</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});

// ---------- Input ----------

describe("Input", () => {
  it("renders with a placeholder", () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText("Enter text")).toBeInTheDocument();
  });

  it("renders as an input element with default text type", () => {
    render(<Input placeholder="Type here" />);
    const input = screen.getByPlaceholderText("Type here");
    expect(input).toHaveAttribute("type", "text");
  });

  it("handles onChange events", () => {
    const handleChange = vi.fn();
    render(<Input placeholder="Type" onChange={handleChange} />);
    const input = screen.getByPlaceholderText("Type");
    fireEvent.change(input, { target: { value: "hello" } });
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it("supports disabled state", () => {
    render(<Input placeholder="Disabled" disabled />);
    expect(screen.getByPlaceholderText("Disabled")).toBeDisabled();
  });

  it("renders a label when provided", () => {
    render(<Input label="Email Address" placeholder="email" />);
    expect(screen.getByText("Email Address")).toBeInTheDocument();
    // Label should be associated via htmlFor
    const label = screen.getByText("Email Address");
    expect(label.tagName).toBe("LABEL");
  });

  it("shows required asterisk when required prop is set", () => {
    render(<Input label="Name" required placeholder="name" />);
    const asterisk = document.querySelector('[aria-hidden="true"]');
    expect(asterisk).toBeInTheDocument();
    expect(asterisk?.textContent).toBe("*");
  });

  it("renders description text when provided", () => {
    render(<Input description="A helpful hint" placeholder="hint" />);
    expect(screen.getByText("A helpful hint")).toBeInTheDocument();
  });

  it("renders error message when provided", () => {
    render(<Input error="This field is required" placeholder="err" />);
    const errorMsg = screen.getByRole("alert");
    expect(errorMsg).toBeInTheDocument();
    expect(errorMsg).toHaveTextContent("This field is required");
  });

  it("sets aria-invalid when error is provided", () => {
    render(<Input error="Bad value" placeholder="invalid" />);
    const input = screen.getByPlaceholderText("invalid");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("does not set aria-invalid when no error", () => {
    render(<Input placeholder="valid" />);
    const input = screen.getByPlaceholderText("valid");
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("supports custom type prop", () => {
    render(<Input type="email" placeholder="email" />);
    expect(screen.getByPlaceholderText("email")).toHaveAttribute(
      "type",
      "email"
    );
  });

  it("merges custom className", () => {
    render(<Input className="my-class" placeholder="cls" />);
    const input = screen.getByPlaceholderText("cls");
    expect(input.className).toContain("my-class");
  });

  it("forwards ref to the input element", () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Input ref={ref} placeholder="ref" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it("uses provided id for the input", () => {
    render(<Input id="my-input" placeholder="id" />);
    const input = screen.getByPlaceholderText("id");
    expect(input).toHaveAttribute("id", "my-input");
  });
});

// ---------- Card ----------

describe("Card", () => {
  it("renders children", () => {
    render(<Card>Card content here</Card>);
    expect(screen.getByText("Card content here")).toBeInTheDocument();
  });

  it("applies default variant classes", () => {
    render(<Card data-testid="card">Content</Card>);
    const card = screen.getByTestId("card");
    expect(card.className).toContain("bg-card");
    expect(card.className).toContain("border");
  });

  it("applies bordered variant classes", () => {
    render(
      <Card variant="bordered" data-testid="card">
        Content
      </Card>
    );
    const card = screen.getByTestId("card");
    expect(card.className).toContain("bg-transparent");
    expect(card.className).toContain("border");
  });

  it("applies elevated variant classes", () => {
    render(
      <Card variant="elevated" data-testid="card">
        Content
      </Card>
    );
    const card = screen.getByTestId("card");
    expect(card.className).toContain("shadow-lg");
  });

  it("applies ghost variant classes", () => {
    render(
      <Card variant="ghost" data-testid="card">
        Content
      </Card>
    );
    const card = screen.getByTestId("card");
    expect(card.className).toContain("bg-transparent");
  });

  it("merges custom className", () => {
    render(
      <Card className="extra-class" data-testid="card">
        Content
      </Card>
    );
    const card = screen.getByTestId("card");
    expect(card.className).toContain("extra-class");
  });

  it("forwards ref to the div element", () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<Card ref={ref}>Ref</Card>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe("CardHeader", () => {
  it("renders children", () => {
    render(<CardHeader>Header content</CardHeader>);
    expect(screen.getByText("Header content")).toBeInTheDocument();
  });

  it("applies padding classes", () => {
    render(<CardHeader data-testid="header">H</CardHeader>);
    const header = screen.getByTestId("header");
    expect(header.className).toContain("p-6");
  });
});

describe("CardTitle", () => {
  it("renders as an h3 element", () => {
    render(<CardTitle>My Title</CardTitle>);
    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading).toHaveTextContent("My Title");
  });
});

describe("CardDescription", () => {
  it("renders description text", () => {
    render(<CardDescription>Some description</CardDescription>);
    expect(screen.getByText("Some description")).toBeInTheDocument();
  });

  it("renders as a p element with muted text", () => {
    render(
      <CardDescription data-testid="desc">Desc</CardDescription>
    );
    const desc = screen.getByTestId("desc");
    expect(desc.tagName).toBe("P");
    expect(desc.className).toContain("text-muted-foreground");
  });
});

describe("CardContent", () => {
  it("renders children", () => {
    render(<CardContent>Body content</CardContent>);
    expect(screen.getByText("Body content")).toBeInTheDocument();
  });

  it("applies p-6 pt-0 padding", () => {
    render(<CardContent data-testid="content">C</CardContent>);
    const content = screen.getByTestId("content");
    expect(content.className).toContain("p-6");
    expect(content.className).toContain("pt-0");
  });
});

describe("CardFooter", () => {
  it("renders children", () => {
    render(<CardFooter>Footer content</CardFooter>);
    expect(screen.getByText("Footer content")).toBeInTheDocument();
  });

  it("applies flex and padding classes", () => {
    render(<CardFooter data-testid="footer">F</CardFooter>);
    const footer = screen.getByTestId("footer");
    expect(footer.className).toContain("flex");
    expect(footer.className).toContain("p-6");
  });
});

// ---------- Badge ----------

describe("Badge", () => {
  it("renders children text", () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("renders as a span element", () => {
    render(<Badge data-testid="badge">Status</Badge>);
    const badge = screen.getByTestId("badge");
    expect(badge.tagName).toBe("SPAN");
  });

  it("applies default variant classes", () => {
    render(<Badge data-testid="badge">Default</Badge>);
    const badge = screen.getByTestId("badge");
    expect(badge.className).toContain("bg-primary/10");
    expect(badge.className).toContain("text-primary");
  });

  it("applies secondary variant classes", () => {
    render(
      <Badge variant="secondary" data-testid="badge">
        Secondary
      </Badge>
    );
    const badge = screen.getByTestId("badge");
    expect(badge.className).toContain("bg-secondary");
  });

  it("applies success variant classes", () => {
    render(
      <Badge variant="success" data-testid="badge">
        Success
      </Badge>
    );
    const badge = screen.getByTestId("badge");
    expect(badge.className).toContain("bg-green-500/15");
    expect(badge.className).toContain("text-green-600");
  });

  it("applies warning variant classes", () => {
    render(
      <Badge variant="warning" data-testid="badge">
        Warning
      </Badge>
    );
    const badge = screen.getByTestId("badge");
    expect(badge.className).toContain("bg-yellow-500/15");
    expect(badge.className).toContain("text-yellow-600");
  });

  it("applies error variant classes", () => {
    render(
      <Badge variant="error" data-testid="badge">
        Error
      </Badge>
    );
    const badge = screen.getByTestId("badge");
    expect(badge.className).toContain("bg-red-500/15");
    expect(badge.className).toContain("text-red-600");
  });

  it("applies info variant classes", () => {
    render(
      <Badge variant="info" data-testid="badge">
        Info
      </Badge>
    );
    const badge = screen.getByTestId("badge");
    expect(badge.className).toContain("bg-blue-500/15");
    expect(badge.className).toContain("text-blue-600");
  });

  it("merges custom className", () => {
    render(
      <Badge className="extra" data-testid="badge">
        Custom
      </Badge>
    );
    const badge = screen.getByTestId("badge");
    expect(badge.className).toContain("extra");
  });

  it("applies base styles (rounded-full, tracking-wide)", () => {
    render(<Badge data-testid="badge">Styled</Badge>);
    const badge = screen.getByTestId("badge");
    expect(badge.className).toContain("rounded-full");
    expect(badge.className).toContain("tracking-wide");
  });

  it("forwards ref to the span element", () => {
    const ref = React.createRef<HTMLSpanElement>();
    render(<Badge ref={ref}>Ref</Badge>);
    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
  });

  it("passes through additional HTML attributes", () => {
    render(
      <Badge data-testid="badge" title="tooltip">
        Attrs
      </Badge>
    );
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveAttribute("title", "tooltip");
  });
});
