-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Hôte : localhost
-- Généré le : mer. 11 mars 2026 à 16:31
-- Version du serveur : 10.4.28-MariaDB
-- Version de PHP : 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `tap_db`
--

-- --------------------------------------------------------

--
-- Structure de la table `agent_validation_memory`
--

CREATE TABLE `agent_validation_memory` (
  `id` int(11) NOT NULL,
  `agent_id` varchar(20) NOT NULL COMMENT 'Ex: B1, B2, B3',
  `validation_status` varchar(30) NOT NULL COMMENT 'approved, rejected, needs_revision',
  `feedback_comment` text DEFAULT NULL COMMENT 'Commentaire de l''utilisateur pour amélioration',
  `candidate_id` int(11) DEFAULT NULL COMMENT 'Optionnel : candidat concerné',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `agent_validation_memory`
--


-- --------------------------------------------------------

--
-- Structure de la table `candidates`
--

CREATE TABLE `candidates` (
  `id` int(11) NOT NULL,
  `id_agent` varchar(9) NOT NULL,
  `nom` varchar(100) NOT NULL,
  `prenom` varchar(100) NOT NULL,
  `titre_profil` varchar(255) DEFAULT NULL,
  `categorie_profil` varchar(50) DEFAULT NULL COMMENT 'Catégorie de profil: dev, data, data_analyst, design, video, autre',
  `ville` varchar(100) DEFAULT NULL,
  `pays` varchar(100) DEFAULT NULL,
  `linkedin` varchar(255) DEFAULT NULL,
  `github` varchar(255) DEFAULT NULL COMMENT 'URL GitHub du candidat',
  `behance` varchar(255) DEFAULT NULL COMMENT 'URL Behance du candidat',
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `annees_experience` int(11) DEFAULT NULL,
  `disponibilite` varchar(50) DEFAULT NULL,
  `pret_a_relocater` varchar(10) DEFAULT NULL,
  `niveau_seniorite` text DEFAULT NULL,
  `resume_bref` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `cv_minio_url` varchar(500) DEFAULT NULL COMMENT 'URL du CV dans MinIO',
  `image_minio_url` varchar(500) DEFAULT NULL COMMENT 'URL de l''image dans MinIO',
  `talentcard_minio_url` varchar(500) DEFAULT NULL COMMENT 'URL de la Talent Card dans MinIO',
  `talentcard_pdf_minio_url` varchar(500) DEFAULT NULL COMMENT 'URL du PDF de la Talent Card dans MinIO',
  `portfolio_url_json` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_croatian_ci DEFAULT NULL,
  `candidate_uuid` varchar(36) DEFAULT NULL COMMENT 'UUID unique pour identifier le candidat',
  `portfolio_json_minio_url` varchar(500) DEFAULT NULL COMMENT 'URL du portfolio JSON dans MinIO',
  `portfolio_pdf_minio_url` varchar(500) DEFAULT NULL COMMENT 'URL du portfolio PDF dans MinIO',
  `pays_cible` varchar(255) DEFAULT NULL COMMENT 'Pays cible pour la recherche (formulaire)',
  `constraints` text DEFAULT NULL COMMENT 'Exigences / pré-requis (salaire, télétravail, localisation...)',
  `search_criteria` text DEFAULT NULL COMMENT 'Ce que le candidat recherche (croissance, startup, projets IA...)',
  `salaire_minimum` varchar(50) DEFAULT NULL COMMENT 'Salaire minimum souhaité (ex: 50000, 50k, À discuter)',
  `embedding` longtext DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `candidates`
--


-- --------------------------------------------------------

--
-- Structure de la table `candidate_postule`
--

CREATE TABLE `candidate_postule` (
  `id` int(11) NOT NULL,
  `job_id` int(11) NOT NULL,
  `candidate_id` int(11) NOT NULL,
  `validated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `note` text DEFAULT NULL COMMENT 'Note optionnelle du recruteur',
  `validate` tinyint(1) DEFAULT 0,
  `use_tap_cv` tinyint(1) DEFAULT NULL COMMENT '1=CV TAP, 0=ancien CV'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Candidats validés par le recruteur pour chaque offre';

-- --------------------------------------------------------

--
-- Structure de la table `candidate_projects`
--

CREATE TABLE `candidate_projects` (
  `id` int(11) NOT NULL,
  `candidate_id` int(11) NOT NULL,
  `project_name` varchar(255) NOT NULL COMMENT 'Nom du projet identifié',
  `project_description` text DEFAULT NULL COMMENT 'Description du projet extraite du CV',
  `github_url` varchar(500) DEFAULT NULL COMMENT 'Lien GitHub du projet',
  `demo_url` varchar(500) DEFAULT NULL COMMENT 'Lien de démo/live du projet',
  `image_urls` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Tableau JSON des URLs des images du projet' CHECK (json_valid(`image_urls`)),
  `additional_links` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Tableau JSON des liens supplémentaires' CHECK (json_valid(`additional_links`)),
  `status` enum('pending','in_progress','completed','skipped') DEFAULT 'pending',
  `notes` text DEFAULT NULL COMMENT 'Notes additionnelles du candidat',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `technologies` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Liste des technologies/outils utilisés (JSON array)' CHECK (json_valid(`technologies`)),
  `detailed_description` text DEFAULT NULL COMMENT 'Description détaillée du projet collectée via le chatbot',
  `additional_info` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Informations additionnelles collectées (JSON object)' CHECK (json_valid(`additional_info`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `candidate_projects`
--


-- --------------------------------------------------------

--
-- Structure de la table `contract_types`
--

CREATE TABLE `contract_types` (
  `id` int(11) NOT NULL,
  `candidate_id` int(11) NOT NULL,
  `type_name` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `contract_types`
--


-- --------------------------------------------------------

--
-- Structure de la table `corrected_cv_versions`
--

CREATE TABLE `corrected_cv_versions` (
  `id` int(11) NOT NULL,
  `candidate_id` int(11) NOT NULL,
  `candidate_uuid` varchar(36) NOT NULL,
  `corrected_cv_minio_url` varchar(500) DEFAULT NULL COMMENT 'URL du CV corrigé dans MinIO',
  `corrected_json_minio_url` varchar(500) DEFAULT NULL COMMENT 'URL du JSON corrigé dans MinIO',
  `corrected_pdf_minio_url` varchar(500) DEFAULT NULL COMMENT 'URL du CV corrigé PDF dans MinIO',
  `validation_status` enum('pending','approved','rejected','needs_revision') DEFAULT 'pending',
  `feedback_comment` text DEFAULT NULL COMMENT 'Commentaires du client pour amélioration',
  `version_number` int(11) DEFAULT 1 COMMENT 'Numéro de version (1, 2, 3...)',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `corrected_cv_versions`
--


-- --------------------------------------------------------

--
-- Structure de la table `email_verification_tokens`
--

CREATE TABLE `email_verification_tokens` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `code` varchar(10) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `email_verification_tokens`
--


-- --------------------------------------------------------

--
-- Structure de la table `experiences`
--

CREATE TABLE `experiences` (
  `id` int(11) NOT NULL,
  `candidate_id` int(11) NOT NULL,
  `role` varchar(255) DEFAULT NULL,
  `entreprise` varchar(255) DEFAULT NULL,
  `periode` varchar(100) DEFAULT NULL,
  `description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `experiences`
--


-- --------------------------------------------------------

--
-- Structure de la table `jobs`
--

CREATE TABLE `jobs` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `categorie_profil` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `niveau_attendu` varchar(50) DEFAULT NULL,
  `experience_min` varchar(50) DEFAULT NULL,
  `presence_sur_site` varchar(100) DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `main_mission` text DEFAULT NULL,
  `tasks_other` varchar(500) DEFAULT NULL,
  `disponibilite` varchar(50) DEFAULT NULL,
  `salary_min` decimal(12,2) DEFAULT NULL,
  `salary_max` decimal(12,2) DEFAULT NULL,
  `urgent` tinyint(1) DEFAULT 0,
  `location_type` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT '["Casablanca","Rabat",...]' CHECK (json_valid(`location_type`)),
  `tasks` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT '["Analyse de données",...]' CHECK (json_valid(`tasks`)),
  `soft_skills` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT '["Autonomie","Communication",...]' CHECK (json_valid(`soft_skills`)),
  `skills` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT '[{"name":"Python","level":"Avancé","priority":"Indispensable"},...]' CHECK (json_valid(`skills`)),
  `languages` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT '[{"name":"Français","level":"Courant","importance":"Indispensable"},...]' CHECK (json_valid(`languages`)),
  `contrat` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci DEFAULT 'stage',
  `niveau_seniorite` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `entreprise` varchar(50) DEFAULT NULL,
  `embedding` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`embedding`)),
  `user_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `jobs`
--


-- --------------------------------------------------------

--
-- Structure de la table `languages`
--

CREATE TABLE `languages` (
  `id` int(11) NOT NULL,
  `candidate_id` int(11) NOT NULL,
  `language_name` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `languages`
--


-- --------------------------------------------------------

--
-- Structure de la table `portfolio_sessions`
--

CREATE TABLE `portfolio_sessions` (
  `id` int(11) NOT NULL,
  `session_id` varchar(36) NOT NULL COMMENT 'UUID de la session',
  `candidate_id` int(11) NOT NULL COMMENT 'ID du candidat',
  `profile` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Profil portfolio en cours de construction' CHECK (json_valid(`profile`)),
  `missing_fields` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Liste des champs manquants' CHECK (json_valid(`missing_fields`)),
  `current_question_key` varchar(100) DEFAULT NULL COMMENT 'Clé du champ en cours de collecte',
  `current_question` text DEFAULT NULL COMMENT 'Question actuelle posée au candidat',
  `asked_questions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Historique des questions posées (clés)' CHECK (json_valid(`asked_questions`)),
  `is_complete` tinyint(1) DEFAULT 0 COMMENT 'True si tous les champs sont remplis',
  `extracted_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Données extraites du CV + Talent Card' CHECK (json_valid(`extracted_data`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `realisations`
--

CREATE TABLE `realisations` (
  `id` int(11) NOT NULL,
  `candidate_id` int(11) NOT NULL,
  `description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `realisations`
--


-- --------------------------------------------------------

--
-- Structure de la table `score`
--

CREATE TABLE `score` (
  `id` int(11) NOT NULL,
  `candidate_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `engine_version` varchar(50) DEFAULT 'CORE_V1_STABLE',
  `sector_detected` varchar(100) DEFAULT NULL,
  `score_global` decimal(5,2) NOT NULL,
  `dim_impact` decimal(5,2) NOT NULL,
  `dim_impact_base` decimal(5,2) NOT NULL,
  `dim_impact_bonus_maturite` decimal(5,2) DEFAULT 0.00,
  `dim_impact_penalite` decimal(5,2) DEFAULT 0.00,
  `impact_precision_score` decimal(5,2) NOT NULL,
  `impact_ampleur_score` decimal(5,2) NOT NULL,
  `impact_portee_score` decimal(5,2) NOT NULL,
  `impact_repetition_score` decimal(5,2) NOT NULL,
  `impact_nature_coeff` decimal(5,2) NOT NULL,
  `dim_hard_skills_depth` decimal(5,2) NOT NULL,
  `hs_complexite_score` decimal(5,2) NOT NULL,
  `hs_maitrise_score` decimal(5,2) NOT NULL,
  `hs_autonomie_score` decimal(5,2) NOT NULL,
  `hs_type_problemes_score` decimal(5,2) NOT NULL,
  `hs_transversalite_score` decimal(5,2) NOT NULL,
  `dim_coherence` decimal(5,2) NOT NULL,
  `coherence_progression_score` decimal(5,2) NOT NULL,
  `coherence_continuite_score` decimal(5,2) NOT NULL,
  `coherence_logique_sectorielle_score` decimal(5,2) NOT NULL,
  `dim_rarete_marche` decimal(5,2) NOT NULL,
  `rarete_densite_score` decimal(5,2) NOT NULL,
  `rarete_combinaison_score` decimal(5,2) NOT NULL,
  `rarete_contribution_score` decimal(5,2) NOT NULL,
  `dim_stabilite` decimal(5,2) NOT NULL,
  `stabilite_coherence_parcours_score` decimal(5,2) NOT NULL,
  `stabilite_duree_score` decimal(5,2) NOT NULL,
  `stabilite_engagement_score` decimal(5,2) NOT NULL,
  `dim_communication` decimal(5,2) NOT NULL,
  `communication_clarte_score` decimal(5,2) NOT NULL,
  `communication_structure_score` decimal(5,2) NOT NULL,
  `communication_precision_score` decimal(5,2) NOT NULL,
  `communication_densite_score` decimal(5,2) NOT NULL,
  `decision` enum('EXCELLENT','BON','MOYEN','FAIBLE') DEFAULT NULL,
  `commentaire` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `score`
--


-- --------------------------------------------------------

--
-- Structure de la table `score_family_projection`
--

CREATE TABLE `score_family_projection` (
  `id` int(11) NOT NULL,
  `score_id` int(11) NOT NULL,
  `candidate_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `c_tech` decimal(5,2) NOT NULL DEFAULT 0.00,
  `c_business` decimal(5,2) NOT NULL DEFAULT 0.00,
  `c_science` decimal(5,2) NOT NULL DEFAULT 0.00,
  `c_org` decimal(5,2) NOT NULL DEFAULT 0.00,
  `c_health` decimal(5,2) NOT NULL DEFAULT 0.00,
  `c_legal` decimal(5,2) NOT NULL DEFAULT 0.00,
  `c_creative` decimal(5,2) NOT NULL DEFAULT 0.00,
  `c_ops` decimal(5,2) NOT NULL DEFAULT 0.00,
  `v_tech` decimal(5,4) NOT NULL DEFAULT 0.0000,
  `v_business` decimal(5,4) NOT NULL DEFAULT 0.0000,
  `v_science` decimal(5,4) NOT NULL DEFAULT 0.0000,
  `v_org` decimal(5,4) NOT NULL DEFAULT 0.0000,
  `v_health` decimal(5,4) NOT NULL DEFAULT 0.0000,
  `v_legal` decimal(5,4) NOT NULL DEFAULT 0.0000,
  `v_creative` decimal(5,4) NOT NULL DEFAULT 0.0000,
  `v_ops` decimal(5,4) NOT NULL DEFAULT 0.0000,
  `dominance_index` decimal(5,2) NOT NULL,
  `famille_dominante` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `score_family_projection`
--


-- --------------------------------------------------------

--
-- Structure de la table `skills`
--

CREATE TABLE `skills` (
  `id` int(11) NOT NULL,
  `candidate_id` int(11) NOT NULL,
  `skill_name` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `skills`
--


-- --------------------------------------------------------

--
-- Structure de la table `skills_score`
--

CREATE TABLE `skills_score` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL COMMENT 'Nom de la compétence',
  `score` decimal(4,2) NOT NULL COMMENT 'Score entre 0.00 et 5.00',
  `status` varchar(50) NOT NULL COMMENT 'validé / déclaré',
  `scope` varchar(50) NOT NULL COMMENT 'core / secondaire'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Compétences scorées par l agent A2';

--
-- Déchargement des données de la table `skills_score`
--


-- --------------------------------------------------------

--
-- Structure de la table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('candidat','recruteur') NOT NULL,
  `is_verified` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `users`
--


--
-- Index pour les tables déchargées
--

--
-- Index pour la table `agent_validation_memory`
--
ALTER TABLE `agent_validation_memory`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_agent_id` (`agent_id`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_agent_created` (`agent_id`,`created_at`);

--
-- Index pour la table `candidates`
--
ALTER TABLE `candidates`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `id_agent` (`id_agent`),
  ADD KEY `fk_candidates_user` (`user_id`);

--
-- Index pour la table `candidate_postule`
--
ALTER TABLE `candidate_postule`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_job_candidate` (`job_id`,`candidate_id`),
  ADD KEY `idx_job` (`job_id`),
  ADD KEY `idx_candidate` (`candidate_id`),
  ADD KEY `idx_validated_at` (`validated_at`);

--
-- Index pour la table `candidate_projects`
--
ALTER TABLE `candidate_projects`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_candidate_id` (`candidate_id`),
  ADD KEY `idx_status` (`status`);

--
-- Index pour la table `contract_types`
--
ALTER TABLE `contract_types`
  ADD PRIMARY KEY (`id`),
  ADD KEY `candidate_id` (`candidate_id`);

--
-- Index pour la table `corrected_cv_versions`
--
ALTER TABLE `corrected_cv_versions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_candidate_uuid` (`candidate_uuid`),
  ADD KEY `idx_candidate_id` (`candidate_id`),
  ADD KEY `idx_validation_status` (`validation_status`);

--
-- Index pour la table `email_verification_tokens`
--
ALTER TABLE `email_verification_tokens`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_evt_user` (`user_id`),
  ADD KEY `idx_evt_code` (`code`);

--
-- Index pour la table `experiences`
--
ALTER TABLE `experiences`
  ADD PRIMARY KEY (`id`),
  ADD KEY `candidate_id` (`candidate_id`);

--
-- Index pour la table `jobs`
--
ALTER TABLE `jobs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_jobs_user` (`user_id`);

--
-- Index pour la table `languages`
--
ALTER TABLE `languages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `candidate_id` (`candidate_id`);

--
-- Index pour la table `portfolio_sessions`
--
ALTER TABLE `portfolio_sessions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `session_id` (`session_id`),
  ADD KEY `idx_session_id` (`session_id`),
  ADD KEY `idx_candidate_id` (`candidate_id`),
  ADD KEY `idx_is_complete` (`is_complete`);

--
-- Index pour la table `realisations`
--
ALTER TABLE `realisations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `candidate_id` (`candidate_id`);

--
-- Index pour la table `score`
--
ALTER TABLE `score`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_candidate_score` (`candidate_id`,`score_global`),
  ADD KEY `idx_created` (`created_at`);

--
-- Index pour la table `score_family_projection`
--
ALTER TABLE `score_family_projection`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_projection` (`score_id`,`candidate_id`),
  ADD KEY `candidate_id` (`candidate_id`);

--
-- Index pour la table `skills`
--
ALTER TABLE `skills`
  ADD PRIMARY KEY (`id`),
  ADD KEY `candidate_id` (`candidate_id`);

--
-- Index pour la table `skills_score`
--
ALTER TABLE `skills_score`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT pour les tables déchargées
--

--
-- AUTO_INCREMENT pour la table `agent_validation_memory`
--
ALTER TABLE `agent_validation_memory`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=63;

--
-- AUTO_INCREMENT pour la table `candidates`
--
ALTER TABLE `candidates`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=87;

--
-- AUTO_INCREMENT pour la table `candidate_postule`
--
ALTER TABLE `candidate_postule`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT pour la table `candidate_projects`
--
ALTER TABLE `candidate_projects`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=202;

--
-- AUTO_INCREMENT pour la table `contract_types`
--
ALTER TABLE `contract_types`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=620;

--
-- AUTO_INCREMENT pour la table `corrected_cv_versions`
--
ALTER TABLE `corrected_cv_versions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=258;

--
-- AUTO_INCREMENT pour la table `email_verification_tokens`
--
ALTER TABLE `email_verification_tokens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT pour la table `experiences`
--
ALTER TABLE `experiences`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=463;

--
-- AUTO_INCREMENT pour la table `jobs`
--
ALTER TABLE `jobs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT pour la table `languages`
--
ALTER TABLE `languages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=693;

--
-- AUTO_INCREMENT pour la table `portfolio_sessions`
--
ALTER TABLE `portfolio_sessions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT pour la table `realisations`
--
ALTER TABLE `realisations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=655;

--
-- AUTO_INCREMENT pour la table `score`
--
ALTER TABLE `score`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT pour la table `score_family_projection`
--
ALTER TABLE `score_family_projection`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT pour la table `skills`
--
ALTER TABLE `skills`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1849;

--
-- AUTO_INCREMENT pour la table `skills_score`
--
ALTER TABLE `skills_score`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=89;

--
-- AUTO_INCREMENT pour la table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=37;

--
-- Contraintes pour les tables déchargées
--

--
-- Contraintes pour la table `candidates`
--
ALTER TABLE `candidates`
  ADD CONSTRAINT `fk_candidates_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Contraintes pour la table `candidate_postule`
--
ALTER TABLE `candidate_postule`
  ADD CONSTRAINT `candidate_postule_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `candidate_postule_ibfk_2` FOREIGN KEY (`candidate_id`) REFERENCES `candidates` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `candidate_projects`
--
ALTER TABLE `candidate_projects`
  ADD CONSTRAINT `candidate_projects_ibfk_1` FOREIGN KEY (`candidate_id`) REFERENCES `candidates` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `contract_types`
--
ALTER TABLE `contract_types`
  ADD CONSTRAINT `contract_types_ibfk_1` FOREIGN KEY (`candidate_id`) REFERENCES `candidates` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `corrected_cv_versions`
--
ALTER TABLE `corrected_cv_versions`
  ADD CONSTRAINT `corrected_cv_versions_ibfk_1` FOREIGN KEY (`candidate_id`) REFERENCES `candidates` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `experiences`
--
ALTER TABLE `experiences`
  ADD CONSTRAINT `experiences_ibfk_1` FOREIGN KEY (`candidate_id`) REFERENCES `candidates` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `jobs`
--
ALTER TABLE `jobs`
  ADD CONSTRAINT `fk_jobs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Contraintes pour la table `languages`
--
ALTER TABLE `languages`
  ADD CONSTRAINT `languages_ibfk_1` FOREIGN KEY (`candidate_id`) REFERENCES `candidates` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `portfolio_sessions`
--
ALTER TABLE `portfolio_sessions`
  ADD CONSTRAINT `portfolio_sessions_ibfk_1` FOREIGN KEY (`candidate_id`) REFERENCES `candidates` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `realisations`
--
ALTER TABLE `realisations`
  ADD CONSTRAINT `realisations_ibfk_1` FOREIGN KEY (`candidate_id`) REFERENCES `candidates` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `score_family_projection`
--
ALTER TABLE `score_family_projection`
  ADD CONSTRAINT `score_family_projection_ibfk_1` FOREIGN KEY (`score_id`) REFERENCES `score` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `score_family_projection_ibfk_2` FOREIGN KEY (`candidate_id`) REFERENCES `candidates` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `skills`
--
ALTER TABLE `skills`
  ADD CONSTRAINT `skills_ibfk_1` FOREIGN KEY (`candidate_id`) REFERENCES `candidates` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
