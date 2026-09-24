//! Packs: installable, sandboxed JS packages (spec/packs/), plus Connected
//! apps, the local HTTP API for external programs. Both share one set of
//! permission names.

pub mod archive;
pub mod commands;
pub mod connected_apps;
pub mod error;
pub mod files_list;
#[cfg(test)]
mod fixture_tests;
pub mod manifest;
pub mod net;
#[cfg(test)]
mod net_tests;
pub mod signature;
#[cfg(test)]
mod signature_tests;
#[cfg(any(test, feature = "pack-signing"))]
pub mod signer;
pub mod store;
pub mod validate;
