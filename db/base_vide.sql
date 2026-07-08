--
-- PostgreSQL database dump
--

\restrict n09qWEIQsMgZTxfmCgsIzDnfxYym8hGnI9tacpSOhnmbBN6SCyccvNFagwNXuc9

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: boost_pricing_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.boost_pricing_config (
    id bigint DEFAULT 1 NOT NULL,
    item_feature_price_cents integer DEFAULT 499 NOT NULL,
    item_bump_price_cents integer DEFAULT 149 NOT NULL,
    project_feature_price_cents integer DEFAULT 499 NOT NULL,
    project_bump_price_cents integer DEFAULT 149 NOT NULL,
    feature_duration_days integer DEFAULT 7 NOT NULL,
    CONSTRAINT boost_pricing_config_single_row CHECK ((id = 1))
);


--
-- Name: cities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cities (
    id bigint NOT NULL,
    country text NOT NULL,
    city text NOT NULL,
    zip_code text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cities_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cities_id_seq OWNED BY public.cities.id;


--
-- Name: code_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.code_settings (
    id integer DEFAULT 1 NOT NULL,
    length integer DEFAULT 6 NOT NULL,
    no_ambiguous boolean DEFAULT true NOT NULL,
    use_special boolean DEFAULT false NOT NULL,
    use_spaces boolean DEFAULT false NOT NULL
);


--
-- Name: conseil_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conseil_categories (
    id bigint NOT NULL,
    label text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: conseil_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.conseil_categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: conseil_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.conseil_categories_id_seq OWNED BY public.conseil_categories.id;


--
-- Name: conseil_favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conseil_favorites (
    user_id bigint NOT NULL,
    content_id bigint NOT NULL
);


--
-- Name: conseil_likes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conseil_likes (
    user_id bigint NOT NULL,
    content_id bigint NOT NULL
);


--
-- Name: conseil_tools; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conseil_tools (
    id bigint NOT NULL,
    content_id bigint NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    image_url text DEFAULT ''::text NOT NULL,
    external_url text DEFAULT ''::text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: conseil_tools_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.conseil_tools_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: conseil_tools_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.conseil_tools_id_seq OWNED BY public.conseil_tools.id;


--
-- Name: containers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.containers (
    id bigint NOT NULL,
    deposit_point_id bigint NOT NULL,
    name text NOT NULL,
    capacity integer DEFAULT 10 NOT NULL,
    current_count integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'actif'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    maintenance_reason text DEFAULT ''::text NOT NULL,
    maintenance_start timestamp with time zone,
    maintenance_end timestamp with time zone
);


--
-- Name: containers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.containers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: containers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.containers_id_seq OWNED BY public.containers.id;


--
-- Name: deposit_point_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deposit_point_types (
    id bigint NOT NULL,
    label text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: deposit_point_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.deposit_point_types_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: deposit_point_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.deposit_point_types_id_seq OWNED BY public.deposit_point_types.id;


--
-- Name: deposit_points; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deposit_points (
    id bigint NOT NULL,
    name text NOT NULL,
    address text NOT NULL,
    zip_code text NOT NULL,
    city text NOT NULL,
    country text DEFAULT 'France'::text NOT NULL,
    latitude double precision,
    longitude double precision,
    status text DEFAULT 'actif'::text NOT NULL,
    type text DEFAULT 'conteneur'::text NOT NULL,
    opening_hours text DEFAULT ''::text NOT NULL,
    internal_comment text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    photos text[] DEFAULT '{}'::text[] NOT NULL
);


--
-- Name: deposit_points_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.deposit_points_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: deposit_points_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.deposit_points_id_seq OWNED BY public.deposit_points.id;


--
-- Name: employee_unavailabilities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_unavailabilities (
    id bigint NOT NULL,
    employee_id bigint NOT NULL,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    reason text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT employee_unavailabilities_times_check CHECK ((end_time > start_time))
);


--
-- Name: employee_unavailabilities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employee_unavailabilities_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employee_unavailabilities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employee_unavailabilities_id_seq OWNED BY public.employee_unavailabilities.id;


--
-- Name: employee_working_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_working_rules (
    employee_id bigint NOT NULL,
    mon_active boolean DEFAULT true,
    mon_start text DEFAULT '09:00'::text,
    mon_end text DEFAULT '18:00'::text,
    tue_active boolean DEFAULT true,
    tue_start text DEFAULT '09:00'::text,
    tue_end text DEFAULT '18:00'::text,
    wed_active boolean DEFAULT true,
    wed_start text DEFAULT '09:00'::text,
    wed_end text DEFAULT '18:00'::text,
    thu_active boolean DEFAULT true,
    thu_start text DEFAULT '09:00'::text,
    thu_end text DEFAULT '18:00'::text,
    fri_active boolean DEFAULT true,
    fri_start text DEFAULT '09:00'::text,
    fri_end text DEFAULT '18:00'::text,
    sat_active boolean DEFAULT false,
    sat_start text DEFAULT '09:00'::text,
    sat_end text DEFAULT '18:00'::text,
    sun_active boolean DEFAULT false,
    sun_start text DEFAULT '09:00'::text,
    sun_end text DEFAULT '18:00'::text,
    works_public_holidays boolean DEFAULT false,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: event_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_categories (
    id bigint NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'actif'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT event_categories_status_check CHECK ((status = ANY (ARRAY['actif'::text, 'inactif'::text])))
);


--
-- Name: event_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.event_categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: event_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.event_categories_id_seq OWNED BY public.event_categories.id;


--
-- Name: event_registrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_registrations (
    id bigint NOT NULL,
    event_id bigint NOT NULL,
    user_id bigint NOT NULL,
    payment_status text DEFAULT 'gratuit'::text NOT NULL,
    stripe_session_id text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    is_absent boolean DEFAULT false NOT NULL,
    refund_status text DEFAULT 'none'::text NOT NULL,
    refund_amount numeric(10,2) DEFAULT 0.00 NOT NULL,
    stripe_refund_id text DEFAULT ''::text NOT NULL,
    refund_error text DEFAULT ''::text NOT NULL,
    cancelled_at timestamp with time zone,
    cancelled_by text DEFAULT ''::text NOT NULL,
    stripe_payment_intent_id text DEFAULT ''::text NOT NULL,
    refund_request_reason text DEFAULT ''::text NOT NULL,
    event_reminder_sent boolean DEFAULT false NOT NULL
);


--
-- Name: event_registrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.event_registrations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: event_registrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.event_registrations_id_seq OWNED BY public.event_registrations.id;


--
-- Name: event_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_sessions (
    id bigint NOT NULL,
    event_id bigint NOT NULL,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT event_sessions_dates_check CHECK ((end_time > start_time))
);


--
-- Name: event_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.event_sessions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: event_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.event_sessions_id_seq OWNED BY public.event_sessions.id;


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
    id bigint NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    category_id bigint,
    type text NOT NULL,
    date_debut timestamp with time zone NOT NULL,
    date_fin timestamp with time zone NOT NULL,
    lieu text DEFAULT ''::text NOT NULL,
    capacite bigint,
    status text DEFAULT 'brouillon'::text NOT NULL,
    intervenant text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    intervenant_id bigint,
    validation_status text DEFAULT 'approved'::text NOT NULL,
    rejection_comment text DEFAULT ''::text NOT NULL,
    image_url text DEFAULT ''::text NOT NULL,
    pricing_type text DEFAULT 'gratuit'::text NOT NULL,
    price numeric(10,2) DEFAULT 0.00 NOT NULL,
    participant_count bigint DEFAULT 0 NOT NULL,
    intervenant_reminder_sent boolean DEFAULT false NOT NULL,
    CONSTRAINT events_dates_check CHECK ((date_fin >= date_debut)),
    CONSTRAINT events_pricing_type_check CHECK ((pricing_type = ANY (ARRAY['gratuit'::text, 'payant'::text]))),
    CONSTRAINT events_status_check CHECK ((status = ANY (ARRAY['brouillon'::text, 'planifie'::text, 'valide'::text, 'annule'::text, 'termine'::text]))),
    CONSTRAINT events_type_check CHECK ((type = ANY (ARRAY['atelier'::text, 'formation'::text, 'evenement'::text, 'conference'::text]))),
    CONSTRAINT events_validation_status_check CHECK ((validation_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.events_id_seq OWNED BY public.events.id;


--
-- Name: forum_replies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forum_replies (
    id bigint NOT NULL,
    topic_id bigint NOT NULL,
    user_id bigint NOT NULL,
    content text NOT NULL,
    status text DEFAULT 'visible'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    photos text DEFAULT '[]'::text NOT NULL,
    CONSTRAINT forum_replies_status_check CHECK ((status = ANY (ARRAY['visible'::text, 'reported'::text, 'hidden'::text, 'deleted'::text])))
);


--
-- Name: forum_replies_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.forum_replies_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: forum_replies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.forum_replies_id_seq OWNED BY public.forum_replies.id;


--
-- Name: forum_reply_likes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forum_reply_likes (
    user_id bigint NOT NULL,
    reply_id bigint NOT NULL
);


--
-- Name: forum_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forum_reports (
    id bigint NOT NULL,
    topic_id bigint,
    reply_id bigint,
    reported_by bigint NOT NULL,
    reason text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT forum_reports_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'resolved'::text, 'ignored'::text])))
);


--
-- Name: forum_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.forum_reports_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: forum_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.forum_reports_id_seq OWNED BY public.forum_reports.id;


--
-- Name: forum_topics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forum_topics (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    title text NOT NULL,
    content text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    photos text DEFAULT '[]'::text NOT NULL,
    CONSTRAINT forum_topics_status_check CHECK ((status = ANY (ARRAY['open'::text, 'closed'::text, 'hidden'::text])))
);


--
-- Name: forum_topics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.forum_topics_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: forum_topics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.forum_topics_id_seq OWNED BY public.forum_topics.id;


--
-- Name: i18n_languages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.i18n_languages (
    code text NOT NULL,
    label text NOT NULL,
    native_label text NOT NULL,
    dir text DEFAULT 'ltr'::text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    is_builtin boolean DEFAULT false NOT NULL,
    phrases jsonb DEFAULT '{}'::jsonb NOT NULL,
    patterns jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT i18n_languages_code_check CHECK ((code ~ '^[a-z]{2,3}(-[a-z0-9]{2,8})?$'::text)),
    CONSTRAINT i18n_languages_dir_check CHECK ((dir = ANY (ARRAY['ltr'::text, 'rtl'::text])))
);


--
-- Name: item_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_categories (
    id bigint NOT NULL,
    label text NOT NULL,
    emoji text DEFAULT '­ƒôª'::text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: item_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.item_categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: item_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.item_categories_id_seq OWNED BY public.item_categories.id;


--
-- Name: item_conditions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_conditions (
    id bigint NOT NULL,
    label text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: item_conditions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.item_conditions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: item_conditions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.item_conditions_id_seq OWNED BY public.item_conditions.id;


--
-- Name: item_countries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_countries (
    id bigint NOT NULL,
    label text NOT NULL,
    emoji text DEFAULT ''::text NOT NULL,
    zip_length integer DEFAULT 5 NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: item_countries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.item_countries_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: item_countries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.item_countries_id_seq OWNED BY public.item_countries.id;


--
-- Name: item_logistics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_logistics (
    id bigint NOT NULL,
    item_id bigint NOT NULL,
    workflow_status text DEFAULT 'validated'::text NOT NULL,
    deposit_point_id bigint,
    container_id bigint,
    assigned_at timestamp with time zone,
    assigned_by bigint,
    deposit_code text DEFAULT ''::text NOT NULL,
    deposit_code_expires_at timestamp with time zone,
    deposit_code_sent_at timestamp with time zone,
    deposited_at timestamp with time zone,
    deposited_confirmed_by bigint,
    reserved_by_name text DEFAULT ''::text NOT NULL,
    reserved_at timestamp with time zone,
    reservation_expires_at timestamp with time zone,
    pickup_code text DEFAULT ''::text NOT NULL,
    pickup_code_expires_at timestamp with time zone,
    collected_at timestamp with time zone,
    collected_confirmed_by bigint,
    closed_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    cancel_reason text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    reserved_by_user_id bigint,
    payment_validated_at timestamp with time zone,
    picked_up_at timestamp with time zone,
    stripe_checkout_session_id text DEFAULT ''::text NOT NULL,
    stripe_payment_intent_id text DEFAULT ''::text NOT NULL,
    stripe_payment_status text DEFAULT ''::text NOT NULL,
    stripe_amount_cents bigint DEFAULT 0 NOT NULL,
    stripe_currency text DEFAULT 'eur'::text NOT NULL,
    stripe_last_error text DEFAULT ''::text NOT NULL,
    stripe_paid_at timestamp with time zone,
    transaction_ref text DEFAULT ''::text NOT NULL,
    previous_workflow_status text DEFAULT ''::text NOT NULL,
    cancelled_by_user boolean DEFAULT false NOT NULL,
    stripe_platform_fee_cents bigint DEFAULT 0 NOT NULL,
    sale_commission_mode text DEFAULT ''::text NOT NULL,
    deposit_reminder_sent boolean DEFAULT false NOT NULL,
    stripe_refund_id text DEFAULT ''::text NOT NULL,
    refund_amount numeric(10,2) DEFAULT 0.0 NOT NULL,
    refund_error text DEFAULT ''::text NOT NULL
);


--
-- Name: item_logistics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.item_logistics_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: item_logistics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.item_logistics_id_seq OWNED BY public.item_logistics.id;


--
-- Name: item_materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_materials (
    id bigint NOT NULL,
    label text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    impact_coefficient numeric(10,3) DEFAULT 1 NOT NULL
);


--
-- Name: item_materials_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.item_materials_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: item_materials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.item_materials_id_seq OWNED BY public.item_materials.id;


--
-- Name: items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.items (
    id bigint NOT NULL,
    title text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    type text DEFAULT 'don'::text NOT NULL,
    price numeric(12,2) DEFAULT 0 NOT NULL,
    category text DEFAULT ''::text NOT NULL,
    condition text DEFAULT ''::text NOT NULL,
    material text DEFAULT ''::text NOT NULL,
    quantity text DEFAULT '1'::text NOT NULL,
    city text DEFAULT ''::text NOT NULL,
    zip text DEFAULT ''::text NOT NULL,
    delivery_mode text DEFAULT ''::text NOT NULL,
    dimensions text DEFAULT ''::text NOT NULL,
    image text DEFAULT ''::text NOT NULL,
    photos text[] DEFAULT '{}'::text[] NOT NULL,
    reference text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'en attente'::text NOT NULL,
    views integer DEFAULT 0 NOT NULL,
    saves integer DEFAULT 0 NOT NULL,
    interested integer DEFAULT 0 NOT NULL,
    user_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    country text DEFAULT 'France'::text NOT NULL,
    container_id bigint,
    moderation_note text DEFAULT ''::text NOT NULL,
    moderation_details text DEFAULT ''::text NOT NULL,
    moderated_at timestamp with time zone,
    deleted_by_user boolean DEFAULT false NOT NULL,
    weight_value numeric(14,3),
    weight_unit text DEFAULT ''::text NOT NULL,
    weight_grams numeric(14,3),
    user_cancel_previous_status text DEFAULT ''::text NOT NULL,
    featured boolean DEFAULT false NOT NULL,
    featured_until timestamp with time zone,
    bumped_at timestamp with time zone,
    CONSTRAINT items_status_check CHECK ((status = ANY (ARRAY['en attente'::text, 'actif'::text, 'refusee'::text, 'brouillon'::text, 'vendu'::text, 'vendue'::text, 'desactivee'::text, 'desactive'::text]))),
    CONSTRAINT items_type_check CHECK ((type = ANY (ARRAY['don'::text, 'vente'::text]))),
    CONSTRAINT items_weight_unit_check CHECK ((weight_unit = ANY (ARRAY[''::text, 'mg'::text, 'g'::text, 'kg'::text])))
);


--
-- Name: items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.items_id_seq OWNED BY public.items.id;


--
-- Name: material_alert_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.material_alert_subscriptions (
    user_id bigint NOT NULL,
    material_label text NOT NULL,
    material_label_normalized text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: moderation_reasons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.moderation_reasons (
    id bigint NOT NULL,
    label text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: moderation_reasons_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.moderation_reasons_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: moderation_reasons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.moderation_reasons_id_seq OWNED BY public.moderation_reasons.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type text NOT NULL,
    unread boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: pricing_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pricing_rules (
    id bigint NOT NULL,
    label text NOT NULL,
    type text NOT NULL,
    amount numeric(12,2) DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pricing_rules_type_check CHECK ((type = ANY (ARRAY['commission'::text, 'subscription'::text, 'promotion'::text, 'flat_fee'::text])))
);


--
-- Name: pricing_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pricing_rules_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pricing_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pricing_rules_id_seq OWNED BY public.pricing_rules.id;


--
-- Name: pro_seller_ratings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pro_seller_ratings (
    id bigint NOT NULL,
    item_id bigint NOT NULL,
    pro_user_id bigint NOT NULL,
    seller_user_id bigint NOT NULL,
    stars smallint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pro_seller_ratings_stars_check CHECK (((stars >= 1) AND (stars <= 5)))
);


--
-- Name: pro_seller_ratings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pro_seller_ratings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pro_seller_ratings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pro_seller_ratings_id_seq OWNED BY public.pro_seller_ratings.id;


--
-- Name: professional_item_watchlist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.professional_item_watchlist (
    user_id bigint NOT NULL,
    item_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: salarie_contents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.salarie_contents (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    body text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'brouillon'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    rejection_comment text DEFAULT ''::text NOT NULL,
    image_url text DEFAULT ''::text NOT NULL,
    is_pinned boolean DEFAULT false NOT NULL,
    category text DEFAULT ''::text NOT NULL,
    target_audience text DEFAULT '[]'::text NOT NULL,
    difficulty_level text DEFAULT ''::text NOT NULL,
    estimated_time text DEFAULT ''::text NOT NULL,
    materials text DEFAULT '[]'::text NOT NULL,
    safety_tips text DEFAULT ''::text NOT NULL,
    summary text DEFAULT ''::text NOT NULL,
    tags text DEFAULT '[]'::text NOT NULL,
    external_url text DEFAULT ''::text NOT NULL,
    scheduled_publish_at timestamp with time zone,
    estimated_time_minutes bigint DEFAULT 0 NOT NULL,
    estimated_time_value double precision DEFAULT 0 NOT NULL,
    estimated_time_unit text DEFAULT ''::text NOT NULL,
    photos text DEFAULT '[]'::text NOT NULL,
    CONSTRAINT salarie_contents_status_check CHECK ((status = ANY (ARRAY['brouillon'::text, 'publie'::text, 'archive'::text, 'en_attente'::text]))),
    CONSTRAINT salarie_contents_type_check CHECK ((type = ANY (ARRAY['conseil'::text, 'actualite'::text])))
);


--
-- Name: salarie_contents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.salarie_contents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: salarie_contents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.salarie_contents_id_seq OWNED BY public.salarie_contents.id;


--
-- Name: sale_commission_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sale_commission_config (
    id integer DEFAULT 1 NOT NULL,
    percent numeric(6,3) DEFAULT 0 NOT NULL,
    mode text DEFAULT 'deducted'::text NOT NULL,
    CONSTRAINT sale_commission_percent_range CHECK (((percent >= (0)::numeric) AND (percent <= (100)::numeric)))
);


--
-- Name: seller_pro_ratings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seller_pro_ratings (
    item_id bigint NOT NULL,
    seller_user_id bigint NOT NULL,
    pro_user_id bigint NOT NULL,
    stars smallint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT seller_pro_ratings_stars_check CHECK (((stars >= 1) AND (stars <= 5)))
);


--
-- Name: service_bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_bookings (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    service_id bigint NOT NULL,
    booking_date timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    payment_status text DEFAULT 'pending'::text NOT NULL,
    amount numeric(12,2) DEFAULT 0 NOT NULL,
    notes text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    slot_id bigint,
    employee_id bigint,
    stripe_session_id text DEFAULT ''::text NOT NULL,
    stripe_payment_intent_id text DEFAULT ''::text NOT NULL,
    message text DEFAULT ''::text NOT NULL,
    booking_type text DEFAULT 'booking'::text NOT NULL,
    refund_status text DEFAULT 'none'::text NOT NULL,
    refund_amount numeric(10,2) DEFAULT 0.00 NOT NULL,
    stripe_refund_id text DEFAULT ''::text NOT NULL,
    refund_error text DEFAULT ''::text NOT NULL,
    refund_request_reason text DEFAULT ''::text NOT NULL,
    cancelled_at timestamp with time zone,
    cancelled_by text DEFAULT ''::text NOT NULL,
    service_reminder_sent boolean DEFAULT false NOT NULL,
    CONSTRAINT service_bookings_payment_check CHECK ((payment_status = ANY (ARRAY['paid'::text, 'pending'::text, 'refunded'::text]))),
    CONSTRAINT service_bookings_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'cancelled'::text, 'completed'::text])))
);


--
-- Name: service_bookings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.service_bookings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: service_bookings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.service_bookings_id_seq OWNED BY public.service_bookings.id;


--
-- Name: service_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_categories (
    id bigint NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'actif'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT service_categories_status_check CHECK ((status = ANY (ARRAY['actif'::text, 'inactif'::text])))
);


--
-- Name: service_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.service_categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: service_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.service_categories_id_seq OWNED BY public.service_categories.id;


--
-- Name: service_providers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_providers (
    service_id bigint NOT NULL,
    employee_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: service_slots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_slots (
    id bigint NOT NULL,
    service_id bigint NOT NULL,
    employee_id bigint NOT NULL,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    capacity integer DEFAULT 1 NOT NULL,
    is_available boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT service_slots_times_check CHECK ((end_time > start_time))
);


--
-- Name: service_slots_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.service_slots_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: service_slots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.service_slots_id_seq OWNED BY public.service_slots.id;


--
-- Name: services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.services (
    id bigint NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    category_id bigint NOT NULL,
    type text NOT NULL,
    price numeric(12,2) DEFAULT 0 NOT NULL,
    status text DEFAULT 'brouillon'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_bookable boolean DEFAULT true NOT NULL,
    image_url text DEFAULT ''::text NOT NULL,
    estimated_duration integer DEFAULT 60 NOT NULL,
    target_audience text DEFAULT 'tous'::text NOT NULL,
    booking_type text DEFAULT 'simple'::text NOT NULL,
    short_description text DEFAULT ''::text NOT NULL,
    detailed_description text DEFAULT ''::text NOT NULL,
    duration_minutes integer DEFAULT 0 NOT NULL,
    photos text[] DEFAULT '{}'::text[] NOT NULL,
    CONSTRAINT services_status_check CHECK ((status = ANY (ARRAY['actif'::text, 'inactif'::text, 'brouillon'::text]))),
    CONSTRAINT services_type_check CHECK ((type = ANY (ARRAY['request'::text, 'booking'::text])))
);


--
-- Name: services_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.services_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: services_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.services_id_seq OWNED BY public.services.id;


--
-- Name: stripe_webhook_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stripe_webhook_events (
    event_id text NOT NULL,
    event_type text NOT NULL,
    processed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: subscription_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_plans (
    key text NOT NULL,
    name text NOT NULL,
    price_euro integer NOT NULL,
    features text[] NOT NULL
);


--
-- Name: support_conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_conversations (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    assigned_to bigint,
    subject text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT support_conversations_status_check CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'resolved'::text])))
);


--
-- Name: support_conversations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.support_conversations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: support_conversations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.support_conversations_id_seq OWNED BY public.support_conversations.id;


--
-- Name: support_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_messages (
    id bigint NOT NULL,
    conversation_id bigint NOT NULL,
    sender_id bigint NOT NULL,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    images text DEFAULT '[]'::text NOT NULL
);


--
-- Name: support_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.support_messages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: support_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.support_messages_id_seq OWNED BY public.support_messages.id;


--
-- Name: system_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_logs (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    level text NOT NULL,
    source text NOT NULL,
    message text NOT NULL,
    metadata jsonb,
    CONSTRAINT system_logs_level_check CHECK ((level = ANY (ARRAY['INFO'::text, 'WARN'::text, 'ERROR'::text, 'DEBUG'::text])))
);


--
-- Name: system_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_logs_id_seq OWNED BY public.system_logs.id;


--
-- Name: upcycling_project_bookmarks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.upcycling_project_bookmarks (
    project_id bigint NOT NULL,
    user_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: upcycling_project_feed_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.upcycling_project_feed_metrics (
    project_id bigint NOT NULL,
    user_id bigint NOT NULL,
    impressions bigint DEFAULT 0 NOT NULL,
    clicks bigint DEFAULT 0 NOT NULL,
    last_seen_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: upcycling_project_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.upcycling_project_images (
    id bigint NOT NULL,
    project_id bigint NOT NULL,
    url text NOT NULL,
    image_type text DEFAULT 'autre'::text NOT NULL,
    added_at timestamp with time zone DEFAULT now() NOT NULL,
    is_step_image boolean DEFAULT false NOT NULL,
    CONSTRAINT upcycling_project_images_type_check CHECK ((image_type = ANY (ARRAY['avant'::text, 'apres'::text, 'autre'::text])))
);


--
-- Name: upcycling_project_images_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.upcycling_project_images_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: upcycling_project_images_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.upcycling_project_images_id_seq OWNED BY public.upcycling_project_images.id;


--
-- Name: upcycling_project_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.upcycling_project_items (
    id bigint NOT NULL,
    project_id bigint NOT NULL,
    item_id bigint NOT NULL,
    added_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: upcycling_project_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.upcycling_project_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: upcycling_project_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.upcycling_project_items_id_seq OWNED BY public.upcycling_project_items.id;


--
-- Name: upcycling_project_likes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.upcycling_project_likes (
    project_id bigint NOT NULL,
    user_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: upcycling_projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.upcycling_projects (
    id bigint NOT NULL,
    pro_user_id bigint NOT NULL,
    title text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    category text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'brouillon'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    moderation_status text DEFAULT 'pending'::text NOT NULL,
    moderation_note text DEFAULT ''::text NOT NULL,
    project_steps jsonb DEFAULT '[]'::jsonb NOT NULL,
    featured boolean DEFAULT false NOT NULL,
    featured_until timestamp with time zone,
    bumped_at timestamp with time zone,
    is_featured boolean DEFAULT false NOT NULL,
    CONSTRAINT upcycling_projects_status_check CHECK ((status = ANY (ARRAY['brouillon'::text, 'publie'::text])))
);


--
-- Name: upcycling_projects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.upcycling_projects_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: upcycling_projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.upcycling_projects_id_seq OWNED BY public.upcycling_projects.id;


--
-- Name: user_notification_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_notification_settings (
    user_id bigint NOT NULL,
    app_enabled boolean DEFAULT true NOT NULL,
    email_enabled boolean DEFAULT true NOT NULL,
    app_moderation boolean DEFAULT true NOT NULL,
    email_moderation boolean DEFAULT true NOT NULL,
    app_booking_received boolean DEFAULT true NOT NULL,
    email_booking_received boolean DEFAULT true NOT NULL,
    app_point_assigned boolean DEFAULT true NOT NULL,
    email_point_assigned boolean DEFAULT true NOT NULL,
    app_material_deposited boolean DEFAULT true NOT NULL,
    email_material_deposited boolean DEFAULT true NOT NULL,
    app_material_recovered boolean DEFAULT true NOT NULL,
    email_material_recovered boolean DEFAULT true NOT NULL,
    app_rating_received boolean DEFAULT true NOT NULL,
    email_rating_received boolean DEFAULT true NOT NULL,
    app_booking_cancelled boolean DEFAULT true NOT NULL,
    email_booking_cancelled boolean DEFAULT true NOT NULL,
    app_booking_expired boolean DEFAULT true NOT NULL,
    email_booking_expired boolean DEFAULT true NOT NULL,
    app_deposit_reminder boolean DEFAULT true NOT NULL,
    email_deposit_reminder boolean DEFAULT true NOT NULL,
    display_mode text DEFAULT 'light'::text NOT NULL,
    language text DEFAULT 'fr'::text NOT NULL,
    map_type text DEFAULT 'plan'::text NOT NULL,
    show_phone_publicly boolean DEFAULT false NOT NULL,
    show_email_publicly boolean DEFAULT false NOT NULL,
    app_conseil_moderation boolean DEFAULT true NOT NULL,
    email_conseil_moderation boolean DEFAULT true NOT NULL,
    app_new_conseil boolean DEFAULT true NOT NULL,
    email_new_conseil boolean DEFAULT true NOT NULL,
    app_conseil_engagement boolean DEFAULT true NOT NULL,
    app_admin_new_conseil boolean DEFAULT true NOT NULL,
    email_admin_new_conseil boolean DEFAULT true NOT NULL,
    app_project_engagement boolean DEFAULT true NOT NULL,
    app_service_completed boolean DEFAULT true NOT NULL,
    email_service_completed boolean DEFAULT true NOT NULL,
    app_booking_confirmed boolean DEFAULT true NOT NULL,
    email_booking_confirmed boolean DEFAULT true NOT NULL,
    app_booking_request_received boolean DEFAULT true NOT NULL,
    email_booking_request_received boolean DEFAULT true NOT NULL,
    app_prestation_booking_cancelled boolean DEFAULT true NOT NULL,
    email_prestation_booking_cancelled boolean DEFAULT true NOT NULL,
    app_service_reminder boolean DEFAULT true NOT NULL,
    email_service_reminder boolean DEFAULT true NOT NULL,
    app_event_registration boolean DEFAULT true NOT NULL,
    email_event_registration boolean DEFAULT true NOT NULL,
    app_event_cancellation boolean DEFAULT true NOT NULL,
    email_event_cancellation boolean DEFAULT true NOT NULL,
    app_event_reminder boolean DEFAULT true NOT NULL,
    email_event_reminder boolean DEFAULT true NOT NULL,
    app_event_moderation boolean DEFAULT true NOT NULL,
    email_event_moderation boolean DEFAULT true NOT NULL,
    app_forum_new_reply boolean DEFAULT true NOT NULL,
    email_forum_new_reply boolean DEFAULT true NOT NULL,
    app_forum_mention boolean DEFAULT true NOT NULL,
    email_forum_mention boolean DEFAULT true NOT NULL,
    app_forum_moderation boolean DEFAULT true NOT NULL,
    email_forum_moderation boolean DEFAULT true NOT NULL,
    app_admin_forum_report boolean DEFAULT true NOT NULL,
    email_admin_forum_report boolean DEFAULT true NOT NULL,
    app_finance_payment_confirmed boolean DEFAULT true NOT NULL,
    email_finance_payment_confirmed boolean DEFAULT true NOT NULL,
    app_finance_payment_received boolean DEFAULT true NOT NULL,
    email_finance_payment_received boolean DEFAULT true NOT NULL,
    app_finance_payment_failed boolean DEFAULT true NOT NULL,
    email_finance_payment_failed boolean DEFAULT true NOT NULL,
    app_finance_refund_issued boolean DEFAULT true NOT NULL,
    email_finance_refund_issued boolean DEFAULT true NOT NULL,
    app_finance_subscription_active boolean DEFAULT true NOT NULL,
    email_finance_subscription_active boolean DEFAULT true NOT NULL,
    app_material_alerts boolean DEFAULT true NOT NULL,
    email_conseil_engagement boolean DEFAULT true NOT NULL,
    email_project_engagement boolean DEFAULT true NOT NULL,
    email_material_alerts boolean DEFAULT true NOT NULL,
    app_new_message_received boolean DEFAULT true NOT NULL,
    email_new_message_received boolean DEFAULT true NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    firstname text NOT NULL,
    lastname text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    role text DEFAULT 'particulier'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    employment_status text DEFAULT ''::text NOT NULL,
    job_function text DEFAULT ''::text NOT NULL,
    admin_note text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_login_at timestamp with time zone,
    phone text DEFAULT ''::text NOT NULL,
    city text DEFAULT ''::text NOT NULL,
    company_name text DEFAULT ''::text NOT NULL,
    company_manager text DEFAULT ''::text NOT NULL,
    siret text DEFAULT ''::text NOT NULL,
    address text DEFAULT ''::text NOT NULL,
    zip_code text DEFAULT ''::text NOT NULL,
    activity_type text DEFAULT ''::text NOT NULL,
    intervention_zone text DEFAULT ''::text NOT NULL,
    subscription_type text DEFAULT 'gratuit'::text NOT NULL,
    subscription_start timestamp with time zone,
    employee_role text DEFAULT ''::text NOT NULL,
    site_location text DEFAULT ''::text NOT NULL,
    skills text DEFAULT ''::text NOT NULL,
    admin_role text DEFAULT ''::text NOT NULL,
    sessions_invalid_before timestamp with time zone,
    stripe_customer_id text DEFAULT ''::text NOT NULL,
    stripe_subscription_id text DEFAULT ''::text NOT NULL,
    tutorial_completed boolean DEFAULT false NOT NULL,
    subscription_billing_cycle text DEFAULT 'month'::text NOT NULL,
    subscription_current_period_end timestamp with time zone,
    subscription_cancel_at_period_end boolean DEFAULT false NOT NULL,
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['particulier'::text, 'professionnel'::text, 'salarie'::text, 'admin'::text]))),
    CONSTRAINT users_status_check CHECK ((status = ANY (ARRAY['active'::text, 'pending'::text, 'suspended'::text])))
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: cities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cities ALTER COLUMN id SET DEFAULT nextval('public.cities_id_seq'::regclass);


--
-- Name: conseil_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conseil_categories ALTER COLUMN id SET DEFAULT nextval('public.conseil_categories_id_seq'::regclass);


--
-- Name: conseil_tools id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conseil_tools ALTER COLUMN id SET DEFAULT nextval('public.conseil_tools_id_seq'::regclass);


--
-- Name: containers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.containers ALTER COLUMN id SET DEFAULT nextval('public.containers_id_seq'::regclass);


--
-- Name: deposit_point_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deposit_point_types ALTER COLUMN id SET DEFAULT nextval('public.deposit_point_types_id_seq'::regclass);


--
-- Name: deposit_points id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deposit_points ALTER COLUMN id SET DEFAULT nextval('public.deposit_points_id_seq'::regclass);


--
-- Name: employee_unavailabilities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_unavailabilities ALTER COLUMN id SET DEFAULT nextval('public.employee_unavailabilities_id_seq'::regclass);


--
-- Name: event_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_categories ALTER COLUMN id SET DEFAULT nextval('public.event_categories_id_seq'::regclass);


--
-- Name: event_registrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_registrations ALTER COLUMN id SET DEFAULT nextval('public.event_registrations_id_seq'::regclass);


--
-- Name: event_sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_sessions ALTER COLUMN id SET DEFAULT nextval('public.event_sessions_id_seq'::regclass);


--
-- Name: events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events ALTER COLUMN id SET DEFAULT nextval('public.events_id_seq'::regclass);


--
-- Name: forum_replies id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_replies ALTER COLUMN id SET DEFAULT nextval('public.forum_replies_id_seq'::regclass);


--
-- Name: forum_reports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_reports ALTER COLUMN id SET DEFAULT nextval('public.forum_reports_id_seq'::regclass);


--
-- Name: forum_topics id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_topics ALTER COLUMN id SET DEFAULT nextval('public.forum_topics_id_seq'::regclass);


--
-- Name: item_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_categories ALTER COLUMN id SET DEFAULT nextval('public.item_categories_id_seq'::regclass);


--
-- Name: item_conditions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_conditions ALTER COLUMN id SET DEFAULT nextval('public.item_conditions_id_seq'::regclass);


--
-- Name: item_countries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_countries ALTER COLUMN id SET DEFAULT nextval('public.item_countries_id_seq'::regclass);


--
-- Name: item_logistics id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_logistics ALTER COLUMN id SET DEFAULT nextval('public.item_logistics_id_seq'::regclass);


--
-- Name: item_materials id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_materials ALTER COLUMN id SET DEFAULT nextval('public.item_materials_id_seq'::regclass);


--
-- Name: items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items ALTER COLUMN id SET DEFAULT nextval('public.items_id_seq'::regclass);


--
-- Name: moderation_reasons id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderation_reasons ALTER COLUMN id SET DEFAULT nextval('public.moderation_reasons_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: pricing_rules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_rules ALTER COLUMN id SET DEFAULT nextval('public.pricing_rules_id_seq'::regclass);


--
-- Name: pro_seller_ratings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pro_seller_ratings ALTER COLUMN id SET DEFAULT nextval('public.pro_seller_ratings_id_seq'::regclass);


--
-- Name: salarie_contents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salarie_contents ALTER COLUMN id SET DEFAULT nextval('public.salarie_contents_id_seq'::regclass);


--
-- Name: service_bookings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_bookings ALTER COLUMN id SET DEFAULT nextval('public.service_bookings_id_seq'::regclass);


--
-- Name: service_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_categories ALTER COLUMN id SET DEFAULT nextval('public.service_categories_id_seq'::regclass);


--
-- Name: service_slots id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_slots ALTER COLUMN id SET DEFAULT nextval('public.service_slots_id_seq'::regclass);


--
-- Name: services id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services ALTER COLUMN id SET DEFAULT nextval('public.services_id_seq'::regclass);


--
-- Name: support_conversations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_conversations ALTER COLUMN id SET DEFAULT nextval('public.support_conversations_id_seq'::regclass);


--
-- Name: support_messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_messages ALTER COLUMN id SET DEFAULT nextval('public.support_messages_id_seq'::regclass);


--
-- Name: system_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_logs ALTER COLUMN id SET DEFAULT nextval('public.system_logs_id_seq'::regclass);


--
-- Name: upcycling_project_images id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upcycling_project_images ALTER COLUMN id SET DEFAULT nextval('public.upcycling_project_images_id_seq'::regclass);


--
-- Name: upcycling_project_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upcycling_project_items ALTER COLUMN id SET DEFAULT nextval('public.upcycling_project_items_id_seq'::regclass);


--
-- Name: upcycling_projects id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upcycling_projects ALTER COLUMN id SET DEFAULT nextval('public.upcycling_projects_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: boost_pricing_config boost_pricing_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.boost_pricing_config
    ADD CONSTRAINT boost_pricing_config_pkey PRIMARY KEY (id);


--
-- Name: cities cities_country_city_zip_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_country_city_zip_code_key UNIQUE (country, city, zip_code);


--
-- Name: cities cities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_pkey PRIMARY KEY (id);


--
-- Name: code_settings code_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.code_settings
    ADD CONSTRAINT code_settings_pkey PRIMARY KEY (id);


--
-- Name: conseil_categories conseil_categories_label_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conseil_categories
    ADD CONSTRAINT conseil_categories_label_key UNIQUE (label);


--
-- Name: conseil_categories conseil_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conseil_categories
    ADD CONSTRAINT conseil_categories_pkey PRIMARY KEY (id);


--
-- Name: conseil_favorites conseil_favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conseil_favorites
    ADD CONSTRAINT conseil_favorites_pkey PRIMARY KEY (user_id, content_id);


--
-- Name: conseil_likes conseil_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conseil_likes
    ADD CONSTRAINT conseil_likes_pkey PRIMARY KEY (user_id, content_id);


--
-- Name: conseil_tools conseil_tools_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conseil_tools
    ADD CONSTRAINT conseil_tools_pkey PRIMARY KEY (id);


--
-- Name: containers containers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.containers
    ADD CONSTRAINT containers_pkey PRIMARY KEY (id);


--
-- Name: deposit_point_types deposit_point_types_label_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deposit_point_types
    ADD CONSTRAINT deposit_point_types_label_key UNIQUE (label);


--
-- Name: deposit_point_types deposit_point_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deposit_point_types
    ADD CONSTRAINT deposit_point_types_pkey PRIMARY KEY (id);


--
-- Name: deposit_points deposit_points_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deposit_points
    ADD CONSTRAINT deposit_points_pkey PRIMARY KEY (id);


--
-- Name: employee_unavailabilities employee_unavailabilities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_unavailabilities
    ADD CONSTRAINT employee_unavailabilities_pkey PRIMARY KEY (id);


--
-- Name: employee_working_rules employee_working_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_working_rules
    ADD CONSTRAINT employee_working_rules_pkey PRIMARY KEY (employee_id);


--
-- Name: event_categories event_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_categories
    ADD CONSTRAINT event_categories_name_key UNIQUE (name);


--
-- Name: event_categories event_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_categories
    ADD CONSTRAINT event_categories_pkey PRIMARY KEY (id);


--
-- Name: event_registrations event_registrations_event_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_registrations
    ADD CONSTRAINT event_registrations_event_id_user_id_key UNIQUE (event_id, user_id);


--
-- Name: event_registrations event_registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_registrations
    ADD CONSTRAINT event_registrations_pkey PRIMARY KEY (id);


--
-- Name: event_sessions event_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_sessions
    ADD CONSTRAINT event_sessions_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: forum_replies forum_replies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_replies
    ADD CONSTRAINT forum_replies_pkey PRIMARY KEY (id);


--
-- Name: forum_reply_likes forum_reply_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_reply_likes
    ADD CONSTRAINT forum_reply_likes_pkey PRIMARY KEY (user_id, reply_id);


--
-- Name: forum_reports forum_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_reports
    ADD CONSTRAINT forum_reports_pkey PRIMARY KEY (id);


--
-- Name: forum_topics forum_topics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_topics
    ADD CONSTRAINT forum_topics_pkey PRIMARY KEY (id);


--
-- Name: i18n_languages i18n_languages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.i18n_languages
    ADD CONSTRAINT i18n_languages_pkey PRIMARY KEY (code);


--
-- Name: item_categories item_categories_label_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_categories
    ADD CONSTRAINT item_categories_label_key UNIQUE (label);


--
-- Name: item_categories item_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_categories
    ADD CONSTRAINT item_categories_pkey PRIMARY KEY (id);


--
-- Name: item_conditions item_conditions_label_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_conditions
    ADD CONSTRAINT item_conditions_label_key UNIQUE (label);


--
-- Name: item_conditions item_conditions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_conditions
    ADD CONSTRAINT item_conditions_pkey PRIMARY KEY (id);


--
-- Name: item_countries item_countries_label_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_countries
    ADD CONSTRAINT item_countries_label_key UNIQUE (label);


--
-- Name: item_countries item_countries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_countries
    ADD CONSTRAINT item_countries_pkey PRIMARY KEY (id);


--
-- Name: item_logistics item_logistics_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_logistics
    ADD CONSTRAINT item_logistics_item_id_key UNIQUE (item_id);


--
-- Name: item_logistics item_logistics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_logistics
    ADD CONSTRAINT item_logistics_pkey PRIMARY KEY (id);


--
-- Name: item_materials item_materials_label_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_materials
    ADD CONSTRAINT item_materials_label_key UNIQUE (label);


--
-- Name: item_materials item_materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_materials
    ADD CONSTRAINT item_materials_pkey PRIMARY KEY (id);


--
-- Name: items items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_pkey PRIMARY KEY (id);


--
-- Name: material_alert_subscriptions material_alert_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_alert_subscriptions
    ADD CONSTRAINT material_alert_subscriptions_pkey PRIMARY KEY (user_id, material_label_normalized);


--
-- Name: moderation_reasons moderation_reasons_label_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderation_reasons
    ADD CONSTRAINT moderation_reasons_label_key UNIQUE (label);


--
-- Name: moderation_reasons moderation_reasons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderation_reasons
    ADD CONSTRAINT moderation_reasons_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: pricing_rules pricing_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_rules
    ADD CONSTRAINT pricing_rules_pkey PRIMARY KEY (id);


--
-- Name: pro_seller_ratings pro_seller_ratings_item_id_pro_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pro_seller_ratings
    ADD CONSTRAINT pro_seller_ratings_item_id_pro_user_id_key UNIQUE (item_id, pro_user_id);


--
-- Name: pro_seller_ratings pro_seller_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pro_seller_ratings
    ADD CONSTRAINT pro_seller_ratings_pkey PRIMARY KEY (id);


--
-- Name: professional_item_watchlist professional_item_watchlist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.professional_item_watchlist
    ADD CONSTRAINT professional_item_watchlist_pkey PRIMARY KEY (user_id, item_id);


--
-- Name: salarie_contents salarie_contents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salarie_contents
    ADD CONSTRAINT salarie_contents_pkey PRIMARY KEY (id);


--
-- Name: sale_commission_config sale_commission_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_commission_config
    ADD CONSTRAINT sale_commission_config_pkey PRIMARY KEY (id);


--
-- Name: seller_pro_ratings seller_pro_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_pro_ratings
    ADD CONSTRAINT seller_pro_ratings_pkey PRIMARY KEY (item_id);


--
-- Name: service_bookings service_bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_bookings
    ADD CONSTRAINT service_bookings_pkey PRIMARY KEY (id);


--
-- Name: service_categories service_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_categories
    ADD CONSTRAINT service_categories_name_key UNIQUE (name);


--
-- Name: service_categories service_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_categories
    ADD CONSTRAINT service_categories_pkey PRIMARY KEY (id);


--
-- Name: service_providers service_providers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_providers
    ADD CONSTRAINT service_providers_pkey PRIMARY KEY (service_id, employee_id);


--
-- Name: service_slots service_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_slots
    ADD CONSTRAINT service_slots_pkey PRIMARY KEY (id);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: stripe_webhook_events stripe_webhook_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_webhook_events
    ADD CONSTRAINT stripe_webhook_events_pkey PRIMARY KEY (event_id);


--
-- Name: subscription_plans subscription_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_pkey PRIMARY KEY (key);


--
-- Name: support_conversations support_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_conversations
    ADD CONSTRAINT support_conversations_pkey PRIMARY KEY (id);


--
-- Name: support_messages support_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_messages
    ADD CONSTRAINT support_messages_pkey PRIMARY KEY (id);


--
-- Name: system_logs system_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_logs
    ADD CONSTRAINT system_logs_pkey PRIMARY KEY (id);


--
-- Name: upcycling_project_bookmarks upcycling_project_bookmarks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upcycling_project_bookmarks
    ADD CONSTRAINT upcycling_project_bookmarks_pkey PRIMARY KEY (project_id, user_id);


--
-- Name: upcycling_project_feed_metrics upcycling_project_feed_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upcycling_project_feed_metrics
    ADD CONSTRAINT upcycling_project_feed_metrics_pkey PRIMARY KEY (project_id, user_id);


--
-- Name: upcycling_project_images upcycling_project_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upcycling_project_images
    ADD CONSTRAINT upcycling_project_images_pkey PRIMARY KEY (id);


--
-- Name: upcycling_project_items upcycling_project_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upcycling_project_items
    ADD CONSTRAINT upcycling_project_items_pkey PRIMARY KEY (id);


--
-- Name: upcycling_project_items upcycling_project_items_project_id_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upcycling_project_items
    ADD CONSTRAINT upcycling_project_items_project_id_item_id_key UNIQUE (project_id, item_id);


--
-- Name: upcycling_project_likes upcycling_project_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upcycling_project_likes
    ADD CONSTRAINT upcycling_project_likes_pkey PRIMARY KEY (project_id, user_id);


--
-- Name: upcycling_projects upcycling_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upcycling_projects
    ADD CONSTRAINT upcycling_projects_pkey PRIMARY KEY (id);


--
-- Name: user_notification_settings user_notification_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notification_settings
    ADD CONSTRAINT user_notification_settings_pkey PRIMARY KEY (user_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_cities_country_city; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cities_country_city ON public.cities USING btree (country, city);


--
-- Name: idx_cities_country_zip; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cities_country_zip ON public.cities USING btree (country, zip_code);


--
-- Name: idx_conseil_categories_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conseil_categories_position ON public.conseil_categories USING btree ("position");


--
-- Name: idx_conseil_tools_content_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conseil_tools_content_id ON public.conseil_tools USING btree (content_id);


--
-- Name: idx_deposit_point_types_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deposit_point_types_position ON public.deposit_point_types USING btree ("position");


--
-- Name: idx_employee_unavailabilities_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_unavailabilities_employee_id ON public.employee_unavailabilities USING btree (employee_id);


--
-- Name: idx_employee_unavailabilities_times; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_unavailabilities_times ON public.employee_unavailabilities USING btree (start_time, end_time);


--
-- Name: idx_event_categories_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_categories_status ON public.event_categories USING btree (status);


--
-- Name: idx_event_registrations_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_registrations_event_id ON public.event_registrations USING btree (event_id);


--
-- Name: idx_event_registrations_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_registrations_user_id ON public.event_registrations USING btree (user_id);


--
-- Name: idx_event_sessions_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_sessions_event_id ON public.event_sessions USING btree (event_id);


--
-- Name: idx_event_sessions_start_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_sessions_start_time ON public.event_sessions USING btree (start_time);


--
-- Name: idx_events_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_category_id ON public.events USING btree (category_id);


--
-- Name: idx_events_date_debut; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_date_debut ON public.events USING btree (date_debut);


--
-- Name: idx_events_intervenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_intervenant_id ON public.events USING btree (intervenant_id);


--
-- Name: idx_events_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_status ON public.events USING btree (status);


--
-- Name: idx_events_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_type ON public.events USING btree (type);


--
-- Name: idx_events_validation_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_validation_status ON public.events USING btree (validation_status);


--
-- Name: idx_i18n_languages_builtin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_i18n_languages_builtin ON public.i18n_languages USING btree (is_builtin);


--
-- Name: idx_i18n_languages_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_i18n_languages_enabled ON public.i18n_languages USING btree (enabled);


--
-- Name: idx_item_categories_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_categories_position ON public.item_categories USING btree ("position");


--
-- Name: idx_item_conditions_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_conditions_position ON public.item_conditions USING btree ("position");


--
-- Name: idx_item_countries_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_countries_position ON public.item_countries USING btree ("position");


--
-- Name: idx_item_materials_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_materials_position ON public.item_materials USING btree ("position");


--
-- Name: idx_items_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_items_status ON public.items USING btree (status);


--
-- Name: idx_items_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_items_user_id ON public.items USING btree (user_id);


--
-- Name: idx_logistics_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_logistics_item ON public.item_logistics USING btree (item_id);


--
-- Name: idx_logistics_reserved_by_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_logistics_reserved_by_user ON public.item_logistics USING btree (reserved_by_user_id);


--
-- Name: idx_logistics_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_logistics_status ON public.item_logistics USING btree (workflow_status);


--
-- Name: idx_logistics_stripe_payment_intent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_logistics_stripe_payment_intent ON public.item_logistics USING btree (stripe_payment_intent_id);


--
-- Name: idx_logistics_stripe_payment_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_logistics_stripe_payment_status ON public.item_logistics USING btree (stripe_payment_status);


--
-- Name: idx_logistics_transaction_ref; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_logistics_transaction_ref ON public.item_logistics USING btree (transaction_ref);


--
-- Name: idx_material_alert_subscriptions_label; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_material_alert_subscriptions_label ON public.material_alert_subscriptions USING btree (material_label_normalized);


--
-- Name: idx_material_alert_subscriptions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_material_alert_subscriptions_user ON public.material_alert_subscriptions USING btree (user_id, created_at DESC);


--
-- Name: idx_moderation_reasons_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_moderation_reasons_position ON public.moderation_reasons USING btree ("position");


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_pricing_rules_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pricing_rules_is_active ON public.pricing_rules USING btree (is_active);


--
-- Name: idx_pricing_rules_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pricing_rules_type ON public.pricing_rules USING btree (type);


--
-- Name: idx_pro_seller_ratings_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pro_seller_ratings_item ON public.pro_seller_ratings USING btree (item_id);


--
-- Name: idx_pro_seller_ratings_seller; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pro_seller_ratings_seller ON public.pro_seller_ratings USING btree (seller_user_id);


--
-- Name: idx_prof_watchlist_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prof_watchlist_item ON public.professional_item_watchlist USING btree (item_id);


--
-- Name: idx_prof_watchlist_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prof_watchlist_user ON public.professional_item_watchlist USING btree (user_id, created_at DESC);


--
-- Name: idx_seller_pro_ratings_pro; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seller_pro_ratings_pro ON public.seller_pro_ratings USING btree (pro_user_id);


--
-- Name: idx_service_bookings_service_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_bookings_service_id ON public.service_bookings USING btree (service_id);


--
-- Name: idx_service_bookings_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_bookings_status ON public.service_bookings USING btree (status);


--
-- Name: idx_service_bookings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_bookings_user_id ON public.service_bookings USING btree (user_id);


--
-- Name: idx_service_categories_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_categories_status ON public.service_categories USING btree (status);


--
-- Name: idx_service_providers_employee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_providers_employee ON public.service_providers USING btree (employee_id);


--
-- Name: idx_service_slots_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_slots_employee_id ON public.service_slots USING btree (employee_id);


--
-- Name: idx_service_slots_service_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_slots_service_id ON public.service_slots USING btree (service_id);


--
-- Name: idx_service_slots_times; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_slots_times ON public.service_slots USING btree (start_time, end_time);


--
-- Name: idx_services_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_services_category_id ON public.services USING btree (category_id);


--
-- Name: idx_services_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_services_status ON public.services USING btree (status);


--
-- Name: idx_support_conversations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_conversations_status ON public.support_conversations USING btree (status);


--
-- Name: idx_support_conversations_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_conversations_updated_at ON public.support_conversations USING btree (updated_at DESC);


--
-- Name: idx_support_conversations_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_conversations_user_id ON public.support_conversations USING btree (user_id);


--
-- Name: idx_support_messages_conversation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_messages_conversation_id ON public.support_messages USING btree (conversation_id);


--
-- Name: idx_system_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_logs_created_at ON public.system_logs USING btree (created_at DESC);


--
-- Name: idx_system_logs_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_logs_level ON public.system_logs USING btree (level);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_users_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_status ON public.users USING btree (status);


--
-- Name: conseil_tools conseil_tools_content_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conseil_tools
    ADD CONSTRAINT conseil_tools_content_id_fkey FOREIGN KEY (content_id) REFERENCES public.salarie_contents(id) ON DELETE CASCADE;


--
-- Name: containers containers_deposit_point_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.containers
    ADD CONSTRAINT containers_deposit_point_id_fkey FOREIGN KEY (deposit_point_id) REFERENCES public.deposit_points(id) ON DELETE CASCADE;


--
-- Name: employee_unavailabilities employee_unavailabilities_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_unavailabilities
    ADD CONSTRAINT employee_unavailabilities_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: employee_working_rules employee_working_rules_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_working_rules
    ADD CONSTRAINT employee_working_rules_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: event_registrations event_registrations_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_registrations
    ADD CONSTRAINT event_registrations_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_registrations event_registrations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_registrations
    ADD CONSTRAINT event_registrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: event_sessions event_sessions_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_sessions
    ADD CONSTRAINT event_sessions_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: events events_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.event_categories(id) ON DELETE RESTRICT;


--
-- Name: events events_intervenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_intervenant_id_fkey FOREIGN KEY (intervenant_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: forum_replies forum_replies_topic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_replies
    ADD CONSTRAINT forum_replies_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES public.forum_topics(id) ON DELETE CASCADE;


--
-- Name: forum_replies forum_replies_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_replies
    ADD CONSTRAINT forum_replies_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: forum_reports forum_reports_reply_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_reports
    ADD CONSTRAINT forum_reports_reply_id_fkey FOREIGN KEY (reply_id) REFERENCES public.forum_replies(id) ON DELETE CASCADE;


--
-- Name: forum_reports forum_reports_reported_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_reports
    ADD CONSTRAINT forum_reports_reported_by_fkey FOREIGN KEY (reported_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: forum_reports forum_reports_topic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_reports
    ADD CONSTRAINT forum_reports_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES public.forum_topics(id) ON DELETE CASCADE;


--
-- Name: forum_topics forum_topics_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_topics
    ADD CONSTRAINT forum_topics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: item_logistics item_logistics_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_logistics
    ADD CONSTRAINT item_logistics_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id);


--
-- Name: item_logistics item_logistics_collected_confirmed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_logistics
    ADD CONSTRAINT item_logistics_collected_confirmed_by_fkey FOREIGN KEY (collected_confirmed_by) REFERENCES public.users(id);


--
-- Name: item_logistics item_logistics_container_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_logistics
    ADD CONSTRAINT item_logistics_container_id_fkey FOREIGN KEY (container_id) REFERENCES public.containers(id);


--
-- Name: item_logistics item_logistics_deposit_point_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_logistics
    ADD CONSTRAINT item_logistics_deposit_point_id_fkey FOREIGN KEY (deposit_point_id) REFERENCES public.deposit_points(id);


--
-- Name: item_logistics item_logistics_deposited_confirmed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_logistics
    ADD CONSTRAINT item_logistics_deposited_confirmed_by_fkey FOREIGN KEY (deposited_confirmed_by) REFERENCES public.users(id);


--
-- Name: item_logistics item_logistics_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_logistics
    ADD CONSTRAINT item_logistics_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: item_logistics item_logistics_reserved_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_logistics
    ADD CONSTRAINT item_logistics_reserved_by_user_id_fkey FOREIGN KEY (reserved_by_user_id) REFERENCES public.users(id);


--
-- Name: items items_container_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_container_id_fkey FOREIGN KEY (container_id) REFERENCES public.containers(id);


--
-- Name: items items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: material_alert_subscriptions material_alert_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_alert_subscriptions
    ADD CONSTRAINT material_alert_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: pro_seller_ratings pro_seller_ratings_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pro_seller_ratings
    ADD CONSTRAINT pro_seller_ratings_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: pro_seller_ratings pro_seller_ratings_pro_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pro_seller_ratings
    ADD CONSTRAINT pro_seller_ratings_pro_user_id_fkey FOREIGN KEY (pro_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: pro_seller_ratings pro_seller_ratings_seller_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pro_seller_ratings
    ADD CONSTRAINT pro_seller_ratings_seller_user_id_fkey FOREIGN KEY (seller_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: professional_item_watchlist professional_item_watchlist_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.professional_item_watchlist
    ADD CONSTRAINT professional_item_watchlist_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: professional_item_watchlist professional_item_watchlist_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.professional_item_watchlist
    ADD CONSTRAINT professional_item_watchlist_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: salarie_contents salarie_contents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salarie_contents
    ADD CONSTRAINT salarie_contents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: seller_pro_ratings seller_pro_ratings_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_pro_ratings
    ADD CONSTRAINT seller_pro_ratings_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: seller_pro_ratings seller_pro_ratings_pro_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_pro_ratings
    ADD CONSTRAINT seller_pro_ratings_pro_user_id_fkey FOREIGN KEY (pro_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: seller_pro_ratings seller_pro_ratings_seller_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_pro_ratings
    ADD CONSTRAINT seller_pro_ratings_seller_user_id_fkey FOREIGN KEY (seller_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: service_bookings service_bookings_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_bookings
    ADD CONSTRAINT service_bookings_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: service_bookings service_bookings_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_bookings
    ADD CONSTRAINT service_bookings_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE RESTRICT;


--
-- Name: service_bookings service_bookings_slot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_bookings
    ADD CONSTRAINT service_bookings_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES public.service_slots(id) ON DELETE SET NULL;


--
-- Name: service_bookings service_bookings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_bookings
    ADD CONSTRAINT service_bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: service_providers service_providers_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_providers
    ADD CONSTRAINT service_providers_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: service_providers service_providers_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_providers
    ADD CONSTRAINT service_providers_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;


--
-- Name: service_slots service_slots_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_slots
    ADD CONSTRAINT service_slots_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: service_slots service_slots_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_slots
    ADD CONSTRAINT service_slots_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;


--
-- Name: services services_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.service_categories(id) ON DELETE RESTRICT;


--
-- Name: support_conversations support_conversations_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_conversations
    ADD CONSTRAINT support_conversations_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: support_conversations support_conversations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_conversations
    ADD CONSTRAINT support_conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: support_messages support_messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_messages
    ADD CONSTRAINT support_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.support_conversations(id) ON DELETE CASCADE;


--
-- Name: support_messages support_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_messages
    ADD CONSTRAINT support_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: upcycling_project_bookmarks upcycling_project_bookmarks_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upcycling_project_bookmarks
    ADD CONSTRAINT upcycling_project_bookmarks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.upcycling_projects(id) ON DELETE CASCADE;


--
-- Name: upcycling_project_bookmarks upcycling_project_bookmarks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upcycling_project_bookmarks
    ADD CONSTRAINT upcycling_project_bookmarks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: upcycling_project_feed_metrics upcycling_project_feed_metrics_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upcycling_project_feed_metrics
    ADD CONSTRAINT upcycling_project_feed_metrics_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.upcycling_projects(id) ON DELETE CASCADE;


--
-- Name: upcycling_project_feed_metrics upcycling_project_feed_metrics_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upcycling_project_feed_metrics
    ADD CONSTRAINT upcycling_project_feed_metrics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: upcycling_project_images upcycling_project_images_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upcycling_project_images
    ADD CONSTRAINT upcycling_project_images_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.upcycling_projects(id) ON DELETE CASCADE;


--
-- Name: upcycling_project_items upcycling_project_items_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upcycling_project_items
    ADD CONSTRAINT upcycling_project_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: upcycling_project_items upcycling_project_items_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upcycling_project_items
    ADD CONSTRAINT upcycling_project_items_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.upcycling_projects(id) ON DELETE CASCADE;


--
-- Name: upcycling_project_likes upcycling_project_likes_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upcycling_project_likes
    ADD CONSTRAINT upcycling_project_likes_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.upcycling_projects(id) ON DELETE CASCADE;


--
-- Name: upcycling_project_likes upcycling_project_likes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upcycling_project_likes
    ADD CONSTRAINT upcycling_project_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: upcycling_projects upcycling_projects_pro_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upcycling_projects
    ADD CONSTRAINT upcycling_projects_pro_user_id_fkey FOREIGN KEY (pro_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_notification_settings user_notification_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notification_settings
    ADD CONSTRAINT user_notification_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict n09qWEIQsMgZTxfmCgsIzDnfxYym8hGnI9tacpSOhnmbBN6SCyccvNFagwNXuc9

