const migrations = [
  {
    name: '0 - createKeyspace',
    migrate: [
      'CREATE KEYSPACE solarwind WITH REPLICATION = {\'class\': \'SimpleStrategy\', \'replication_factor\': 1};'
    ],
    revert: [
      'DROP KEYSPACE solarwind;'
    ]
  },
  {
    name: '1 - createUsersTable',
    migrate: [
      `CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY,
          username VARCHAR,
          email VARCHAR,
          first_name VARCHAR,
          last_name VARCHAR,
          password VARCHAR,
          address VARCHAR,
          public_address VARCHAR,
          nonce BIGINT,
          private_key VARCHAR
        );
      `,
      'CREATE INDEX users_email_idx ON users (email);',
      'CREATE INDEX users_username_idx ON users (username);',
      'CREATE INDEX users_address_idx ON users (address);',
      'CREATE INDEX users_public_address_idx ON users (public_address);'],
    revert: [
      'DROP INDEX users_public_address_idx;',
      'DROP INDEX users_address_idx;',
      'DROP INDEX users_username_idx;',
      'DROP INDEX users_email_idx;',
      'DROP TABLE users;']
  },
  {
    name: '2 - createStarsTable',
    migrate: [
      `CREATE TABLE IF NOT EXISTS stars (
          id UUID PRIMARY KEY,
          edr3_id BIGINT,
          ra VARCHAR,
          dec VARCHAR,
          pm_ra DOUBLE,
          pm_dec DOUBLE,
          parallax DOUBLE,
          x DOUBLE,
          y DOUBLE,
          z DOUBLE,
          mass DOUBLE,
          radius DOUBLE,
          temperature BIGINT,
          magnitude DOUBLE,
          luminosity DOUBLE,
          evolutionary_stage VARCHAR,
          spectral_type VARCHAR,
          age DOUBLE,
          name VARCHAR,
          token_id BIGINT,
          owner_id UUID,
          ship_count INT
        );`
    ],
    revert: [
      'DROP TABLE stars;'
    ]
  },
  {
    name: '3 - createStarDesignations',
    migrate: [
      `CREATE TABLE IF NOT EXISTS star_designations (
          id UUID PRIMARY KEY,
          star_id UUID,
          designation VARCHAR
        );`,
      'CREATE INDEX star_designations_star_id_idx ON star_designations (star_id);'
    ],
    revert: [
      'DROP INDEX star_designations_star_id_idx;',
      'DROP TABLE star_designations;'
    ]
  },
  {
    name: '4 - createShipsTable',
    migrate: [
      `CREATE TABLE IF NOT EXISTS ships (
          id UUID PRIMARY KEY,
          owner_id UUID,
          star_id UUID,
          target_star_id UUID,
          star_name VARCHAR,
          target_star_name VARCHAR,
          health DOUBLE,
          arrival_time TIMESTAMP,
          status INT,
          last_harvested TIMESTAMP,
          speed BIGINT,
          fuel BIGINT,
          name VARCHAR,
          token_id BIGINT
        );
      `,
      'CREATE INDEX ships_owner_id_idx ON ships (owner_id);',
      'CREATE INDEX ships_star_id_idx ON ships (star_id);',
      'CREATE INDEX ships_status_idx ON ships (status);'],
    revert: [
      'DROP INDEX ships_status_idx;',
      'DROP INDEX ships_star_id_idx;',
      'DROP INDEX ships_owner_id_idx;',
      'DROP TABLE ships;'
    ]
  },
  {
    name: '5 - createNearestStarsTable',
    migrate: [
      `CREATE TABLE IF NOT EXISTS nearest_stars (
          star_id UUID,
          distance DOUBLE,
          nearest_star_id UUID,
          PRIMARY KEY (star_id, distance, nearest_star_id)
        );`,
    ],
    revert: [
      'DROP TABLE nearest_stars;'
    ]
  },
  {
    name: '6 - Star name search index',
    migrate: [
      `CREATE CUSTOM INDEX fn_suffix_allcase ON stars (name) USING 'org.apache.cassandra.index.sasi.SASIIndex' 
          WITH OPTIONS = { 
            'mode': 'CONTAINS',
            'analyzer_class': 'org.apache.cassandra.index.sasi.analyzer.NonTokenizingAnalyzer',
            'case_sensitive': 'false'
        };`
    ],
    revert: [
      'DROP INDEX fn_suffix_allcase;'
    ]
  },
  {
    name: '7 - Create events table',
    migrate: [
      `CREATE TABLE IF NOT EXISTS events (
          id UUID PRIMARY KEY,
          user_id UUID,
          type INT,
          text VARCHAR,
          seen BOOLEAN,
          closed BOOLEAN
        );`,
        'CREATE INDEX user_id_idx ON events (user_id);',
        'CREATE INDEX seen_idx ON events (seen);',
        'CREATE INDEX closed_idx ON events (closed);'
    ],
    revert: [
      'DROP TABLE events;'
    ]
  },
  {
    name: '8 - Create tax payments table',
    migrate: [
      `CREATE TABLE IF NOT EXISTS tax_payments (
          id UUID,
          ship_id UUID,
          ship_name VARCHAR,
          star_id UUID,
          amount BIGINT,
          timestamp TIMESTAMP,
          PRIMARY KEY (star_id, timestamp)
        );`,
        //'CREATE INDEX tax_payments_star_id_idx ON tax_payments (star_id);'
    ],
    revert: [
      // 'DROP INDEX tax_payments_timestamp_idx;',
      //'DROP INDEX tax_payments_star_id_idx;',
      'DROP TABLE tax_payments;'
    ]
  },
]

export default migrations