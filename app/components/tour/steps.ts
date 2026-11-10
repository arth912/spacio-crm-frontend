import type { TourOpenable } from "./events";

export type TourSide = "right" | "left" | "bottom" | "top";

export interface TourStep {
  /** Page the step lives on. Omit to stay where the user is. */
  route?: string;
  /** Value of the `data-tour` attribute to light up. Omit for a centred card. */
  target?: string;
  tag: string;
  title: string;
  body: string;
  side?: TourSide;
  /** Real UI the tour opens while this step is showing (closed again when the step changes). */
  open?: TourOpenable;
}

/** Tour for regular users (Designer, Sales). Admin-only screens are intentionally left out. */
export const TOUR_STEPS: TourStep[] = [
  {
    route: "/dashboard",
    tag: "Welcome",
    title: "Welcome to SpaceIO",
    body: "A short tour of everything you can do: clients, catalogue, estimates and billing. Each step lights up one feature. You can skip at any time.",
  },
  {
    route: "/dashboard", target: "nav-dashboard", tag: "Dashboard", side: "right",
    title: "Your business at a glance",
    body: "Start here each day. The dashboard summarises your projects, estimates and billing.",
  },
  {
    route: "/dashboard", target: "dash-stats", tag: "Dashboard", side: "bottom",
    title: "Live numbers",
    body: "These cards update as you create estimates and record payments.",
  },
  {
    route: "/clients", target: "nav-clients", tag: "Clients", side: "right",
    title: "Every client in one place",
    body: "Clients lists everyone you design for, with their projects and contact details.",
  },
  {
    route: "/clients", target: "clients-add", tag: "Clients", side: "bottom",
    title: "Add a client",
    body: "Save a name, phone and address once. You can pick them again in any estimate or bill.",
  },
  {
    route: "/clients", target: "clients-table", tag: "Clients", side: "top",
    title: "Search and open a client",
    body: "Search by name or phone. Click a row to see that client's projects, estimates and payments.",
  },
  {
    route: "/catalogue", target: "nav-catalogue", tag: "Catalogue", side: "right",
    title: "Catalogue and rates",
    body: "Your price list lives here. Set a rate once and every estimate uses it.",
  },
  {
    route: "/catalogue", target: "catalogue-add", tag: "Catalogue", side: "bottom",
    title: "Add an item",
    body: "Use Add item to put a product or service into your catalogue.",
  },
  {
    route: "/catalogue", target: "item-form", open: "item-form", tag: "Catalogue", side: "left",
    title: "Fill in the details",
    body: "Give the item a name and category, pick how it is priced (piece, sq ft or running ft) and enter the rate. Nothing is saved during the tour.",
  },
  {
    route: "/estimations", target: "nav-estimations", tag: "Estimations", side: "right",
    title: "Estimations",
    body: "All your quotations in one list, grouped by status.",
  },
  {
    route: "/estimations", target: "estimate-new", tag: "Estimations", side: "bottom",
    title: "Create an estimate",
    body: "New estimation opens the builder.",
  },
  {
    route: "/quotation-builder", target: "builder-stepper", tag: "Estimations", side: "bottom",
    title: "Four simple steps",
    body: "Project, Rooms, Items, then Quotation. Use Next and Back to move between them.",
  },
  {
    route: "/quotation-builder", target: "builder-panel", tag: "Estimations", side: "top",
    title: "Start with the project",
    body: "Pick an existing client and project, or enter new ones. Fill in the client and project details, then press Next.",
  },
  {
    route: "/quotation-builder", target: "builder-step-2", tag: "Estimations", side: "bottom",
    title: "Rooms",
    body: "Step 2 lists the rooms in the project, such as living room or kitchen. Add the rooms you are quoting for.",
  },
  {
    route: "/quotation-builder", target: "builder-step-3", tag: "Estimations", side: "bottom",
    title: "Items",
    body: "Step 3 maps catalogue items to each room. Pick items, set sizes and quantities, and rates fill in from your catalogue.",
  },
  {
    route: "/quotation-builder", target: "builder-step-4", tag: "Estimations", side: "bottom",
    title: "Quotation",
    body: "Step 4 shows the summary. Apply a discount, add terms, save the quotation and download the PDF to send to your client.",
  },
  {
    route: "/billing", target: "nav-billing", tag: "Billing", side: "right",
    title: "Billing",
    body: "Bills you have drafted or generated, and how much of each is paid.",
  },
  {
    route: "/billing", target: "billing-new", tag: "Billing", side: "bottom",
    title: "Create a bill",
    body: "New billing opens the bill form with your billing template.",
  },
  {
    route: "/billing/new", target: "bill-customer", tag: "Billing", side: "right",
    title: "Choose the client and project",
    body: "Select who the bill is for. Add their GSTIN if they have one.",
  },
  {
    route: "/billing/new", target: "bill-items", tag: "Billing", side: "top",
    title: "Add billing items",
    body: "Name each item and bill it per piece, per sq ft or per running ft. Catalogue names autocomplete.",
  },
  {
    route: "/billing/new", target: "bill-summary", tag: "Billing", side: "left",
    title: "Save, generate and download",
    body: "Check subtotal, discount and GST. Save keeps a draft. Generate locks the bill so you can download the PDF and record payments against it.",
  },
  {
    route: "/dashboard", target: "new-menu", tag: "Shortcut", side: "bottom",
    title: "Create from anywhere",
    body: "The New button starts a new estimate or a new bill from any screen.",
  },
  {
    route: "/dashboard", target: "profile-menu", open: "profile-menu", tag: "Profile", side: "right",
    title: "Your profile and this tour",
    body: "Edit your business details and billing template in My Profile. Choose Tour Guide here, or use the button on your profile page, to replay this walkthrough any time.",
  },
];
