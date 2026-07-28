from __future__ import annotations

import os
import struct
import time
import uuid


def uuid7() -> uuid.UUID:
    timestamp_ms = int(time.time() * 1000)

    ts_bytes = struct.pack(">Q", timestamp_ms)
    ts_6_bytes = ts_bytes[2:]

    time_low = int.from_bytes(ts_6_bytes[0:4], "big")
    time_mid = int.from_bytes(ts_6_bytes[4:6], "big")

    rand_bytes = os.urandom(10)

    rand_a = int.from_bytes(rand_bytes[0:2], "big")
    time_hi_and_version = 0x7000 | (rand_a & 0x0FFF)

    rand_b = int.from_bytes(rand_bytes[2:4], "big")
    clock_seq_val = 0x8000 | (rand_b & 0x3FFF)
    clock_seq_hi_variant = (clock_seq_val >> 8) & 0xFF
    clock_seq_low = clock_seq_val & 0xFF

    node = int.from_bytes(rand_bytes[4:10], "big")

    return uuid.UUID(
        fields=(
            time_low,
            time_mid,
            time_hi_and_version,
            clock_seq_hi_variant,
            clock_seq_low,
            node,
        )
    )
