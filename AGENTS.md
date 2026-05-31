# AGENTS.md

## Project Overview

TriageFlowOPD is an AI-powered outpatient patient flow coordination platform.

The system provides:

* AI-based patient triage
* Queue management
* Hospital navigation
* Payment coordination
* Doctor workflow
* Laboratory workflow
* Pharmacy workflow
* Reception workflow
* Administrative monitoring

## Core Domains

### Patient Domain

Responsibilities:

* Registration
* Symptom collection
* Body map interaction
* Queue tracking
* Navigation
* Payment
* Notification

### Clinical Domain

Responsibilities:

* Doctor consultation
* Triage priority
* Clinical orders
* Follow-up workflow

### Operations Domain

Responsibilities:

* Queue management
* Resource allocation
* Patient routing
* Bottleneck detection

### Payment Domain

Responsibilities:

* Payment creation
* QR payment
* Payment verification
* Payment history

### Mapping Domain

Responsibilities:

* Indoor navigation
* Multi-floor routing
* QR checkpoints
* Dynamic pathfinding

---

## Development Principles

### Rule 1

Business logic must never be placed in controllers.

### Rule 2

Controllers only:

* Validate requests
* Call services
* Return responses

### Rule 3

All database access must go through repositories.

### Rule 4

Every API must have DTO validation.

### Rule 5

Never write raw SQL inside controllers.

### Rule 6

Medical workflows must be traceable.

Every important action must generate an audit log.

### Rule 7

Use role-based authorization.

Roles:

* PATIENT
* RECEPTIONIST
* DOCTOR
* LAB_STAFF
* PHARMACY_STAFF
* CASHIER
* ADMIN

### Rule 8

All APIs must be documented using Swagger.

### Rule 9

Prefer reusable components over duplicated code.

### Rule 10

Write maintainable code before optimizing.
