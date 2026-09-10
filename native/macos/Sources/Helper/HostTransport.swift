import Darwin
import Foundation

/// Kernel-level identity of one end of a pipe or a Unix socket. Two endpoints
/// belong to the same channel when each side's peer handle is the other side's
/// handle, which is what proves the parent that spawned us still holds the
/// other end of our standard streams.
enum TransportEndpoint: Hashable {
    case pipe(handle: UInt64, peer: UInt64)
    case unixSocket(handle: UInt64, peer: UInt64)
}

/// The helper refuses to act unless it is provably a managed child: its own
/// process group leader is itself (so no terminal can inject input), and its
/// three standard descriptors are owned by the live parent process. Anything
/// else — a shell, a debugger, a stray `open` — is rejected before any UI call.
enum HostTransport {
    static func requireManagedParent() throws {
        guard getpgrp() == getpid(),
              parentOwnsStandardTransport() else {
            throw HelperFault.of("COMPUTER_ACTION_BLOCKED", "native helper requires managed parent transport; use the registered Computer Use Tools")
        }
    }

    static func parentOwnsStandardTransport() -> Bool {
        let childEndpoints = [STDIN_FILENO, STDOUT_FILENO, STDERR_FILENO].compactMap { descriptor in
            endpoint(of: getpid(), descriptor: descriptor).map { (descriptor, $0) }
        }
        guard childEndpoints.count == 3,
              Set(childEndpoints.map(\.1)).count == 3 else { return false }

        let parentEndpoints = descriptors(of: getppid()).compactMap { descriptor in
            endpoint(of: getppid(), descriptor: descriptor.proc_fd)
        }
        return childEndpoints.allSatisfy { descriptor, child in
            let matches = parentEndpoints.filter { endpointsMatch(child, $0) }
            if matches.count == 1 { return true }
            // The batch stdin writer may close its parent endpoint before the helper
            // reaches main. Node represents that standard stream as a disconnected
            // Unix socket, while stdout and stderr remain provably parent-owned.
            return descriptor == STDIN_FILENO && matches.isEmpty && isDisconnected(child)
        }
    }

    private static func descriptors(of pid: Int32) -> [proc_fdinfo] {
        let capacity = Int(max(proc_pidinfo(pid, PROC_PIDLISTFDS, 0, nil, 0), 0))
        guard capacity >= MemoryLayout<proc_fdinfo>.size else { return [] }
        var table = Array(repeating: proc_fdinfo(), count: capacity / MemoryLayout<proc_fdinfo>.size)
        let bytes = table.withUnsafeMutableBytes { buffer in
            proc_pidinfo(pid, PROC_PIDLISTFDS, 0, buffer.baseAddress, Int32(buffer.count))
        }
        guard bytes > 0 else { return [] }
        return Array(table.prefix(Int(bytes) / MemoryLayout<proc_fdinfo>.size))
    }

    private static func endpoint(of pid: Int32, descriptor: Int32) -> TransportEndpoint? {
        var pipe = pipe_fdinfo()
        let pipeSize = MemoryLayout<pipe_fdinfo>.size
        if proc_pidfdinfo(pid, descriptor, PROC_PIDFDPIPEINFO, &pipe, Int32(pipeSize)) == pipeSize {
            return .pipe(handle: pipe.pipeinfo.pipe_handle, peer: pipe.pipeinfo.pipe_peerhandle)
        }

        var socket = socket_fdinfo()
        let socketSize = MemoryLayout<socket_fdinfo>.size
        guard proc_pidfdinfo(pid, descriptor, PROC_PIDFDSOCKETINFO, &socket, Int32(socketSize)) == socketSize,
              socket.psi.soi_family == AF_UNIX,
              socket.psi.soi_type == SOCK_STREAM,
              socket.psi.soi_kind == SOCKINFO_UN else { return nil }
        return .unixSocket(
            handle: socket.psi.soi_so,
            peer: socket.psi.soi_proto.pri_un.unsi_conn_so
        )
    }

    private static func endpointsMatch(_ child: TransportEndpoint, _ parent: TransportEndpoint) -> Bool {
        switch (child, parent) {
        case let (.pipe(childHandle, childPeer), .pipe(parentHandle, parentPeer)),
             let (.unixSocket(childHandle, childPeer), .unixSocket(parentHandle, parentPeer)):
            return childPeer != 0
                && childHandle == parentPeer
                && childPeer == parentHandle
        default:
            return false
        }
    }

    private static func isDisconnected(_ endpoint: TransportEndpoint) -> Bool {
        if case let .unixSocket(_, peer) = endpoint { return peer == 0 }
        return false
    }
}
