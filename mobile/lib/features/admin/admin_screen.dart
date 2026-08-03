import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api_client.dart';
import '../../core/theme.dart';

class MobileReport {
  final String id;
  final String reporterEmail;
  final String reportedId;
  final String reportedEmail;
  final String reportedStatus;
  final String reason;
  final String details;
  final String status;

  MobileReport({
    required this.id,
    required this.reporterEmail,
    required this.reportedId,
    required this.reportedEmail,
    required this.reportedStatus,
    required this.reason,
    required this.details,
    required this.status,
  });

  factory MobileReport.fromJson(Map<String, dynamic> json) {
    return MobileReport(
      id: json['id'] as String,
      reporterEmail: json['reporter']?['email'] as String? ?? 'reporter@matchnova.com',
      reportedId: json['reportedId'] as String,
      reportedEmail: json['reported']?['email'] as String? ?? 'target@matchnova.com',
      reportedStatus: json['reported']?['status'] as String? ?? 'ACTIVE',
      reason: json['reason'] as String? ?? 'OTHER',
      details: json['details'] as String? ?? 'None provided.',
      status: json['status'] as String? ?? 'PENDING',
    );
  }
}

class AdminScreen extends ConsumerStatefulWidget {
  const AdminScreen({super.key});

  @override
  ConsumerState<AdminScreen> createState() => _AdminScreenState();
}

class _AdminScreenState extends ConsumerState<AdminScreen> {
  List<MobileReport> _reports = [];
  bool _loading = true;
  String? _errorMsg;
  String? _successMsg;

  @override
  void initState() {
    super.initState();
    _fetchReports();
  }

  Future<void> _fetchReports() async {
    setState(() {
      _loading = true;
      _errorMsg = null;
    });

    try {
      final dio = ref.read(dioProvider);
      final response = await dio.get('/reports');
      final list = (response.data as List)
          .map((json) => MobileReport.fromJson(json as Map<String, dynamic>))
          .toList();

      setState(() {
        _reports = list;
        _loading = false;
      });
    } on DioException catch (e) {
      setState(() {
        _loading = false;
        _errorMsg = e.response?.statusCode == 403
            ? 'Access Forbidden. Administrator credentials required.'
            : 'Failed to load moderator tickets queue.';
      });
    } catch (e) {
      setState(() {
        _loading = false;
        _errorMsg = 'Error loading reports.';
      });
    }
  }

  Future<void> _resolveTicket(String id, String status) async {
    setState(() {
      _successMsg = null;
      _errorMsg = null;
    });
    try {
      final dio = ref.read(dioProvider);
      await dio.patch('/reports/$id/resolve', data: {'status': status});
      setState(() {
        _successMsg = 'Ticket resolved successfully.';
      });
      _fetchReports();
    } catch (e) {
      setState(() {
        _errorMsg = 'Failed to resolve ticket.';
      });
    }
  }

  Future<void> _suspendUser(String userId) async {
    setState(() {
      _successMsg = null;
      _errorMsg = null;
    });
    try {
      final dio = ref.read(dioProvider);
      await dio.post('/reports/moderate/$userId', data: {'status': 'SUSPENDED'});
      setState(() {
        _successMsg = 'Target user account suspended.';
      });
      _fetchReports();
    } catch (e) {
      setState(() {
        _errorMsg = 'Failed to suspend user account.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Moderator Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchReports,
          ),
        ],
      ),
      body: Column(
        children: [
          if (_successMsg != null)
            Container(
              width: double.infinity,
              color: Colors.green.withOpacity(0.15),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Text(
                _successMsg!,
                style: const TextStyle(color: Colors.greenAccent, fontSize: 13),
              ),
            ),
          if (_errorMsg != null)
            Container(
              width: double.infinity,
              color: Colors.redAccent.withOpacity(0.15),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Text(
                _errorMsg!,
                style: const TextStyle(color: Colors.redAccent, fontSize: 13),
              ),
            ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _reports.isEmpty
                    ? const Center(
                        child: Text(
                          'No incident reports. Queue clean!',
                          style: TextStyle(color: AppColors.textSecondary),
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _reports.length,
                        itemBuilder: (context, index) {
                          final report = _reports[index];
                          return Card(
                            color: AppColors.surface,
                            margin: const EdgeInsets.only(bottom: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                              side: const BorderSide(color: AppColors.border),
                            ),
                            child: Padding(
                              padding: const EdgeInsets.all(16.0),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        'Reason: ${report.reason}',
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          color: Colors.amberAccent,
                                        ),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 8,
                                          vertical: 4,
                                        ),
                                        decoration: BoxDecoration(
                                          color: report.status == 'PENDING'
                                              ? Colors.blue.withOpacity(0.2)
                                              : Colors.grey.withOpacity(0.2),
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Text(
                                          report.status,
                                          style: const TextStyle(fontSize: 10),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 12),
                                  Text('Reporter: ${report.reporterEmail}'),
                                  Text(
                                    'Reported: ${report.reportedEmail} (${report.reportedStatus})',
                                    style: const TextStyle(fontWeight: FontWeight.w600),
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    'Details: ${report.details}',
                                    style: const TextStyle(
                                      color: AppColors.textSecondary,
                                      fontSize: 13,
                                    ),
                                  ),
                                  const SizedBox(height: 16),
                                  if (report.status == 'PENDING') ...[
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.end,
                                      children: [
                                        TextButton(
                                          onPressed: () =>
                                              _resolveTicket(report.id, 'DISMISSED'),
                                          child: const Text('Dismiss'),
                                        ),
                                        const SizedBox(width: 8),
                                        ElevatedButton(
                                          onPressed: () =>
                                              _resolveTicket(report.id, 'RESOLVED'),
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: Colors.green,
                                            foregroundColor: Colors.white,
                                            minimumSize: const Size(80, 36),
                                          ),
                                          child: const Text('Resolve'),
                                        ),
                                        if (report.reportedStatus != 'SUSPENDED') ...[
                                          const SizedBox(width: 8),
                                          ElevatedButton(
                                            onPressed: () => _suspendUser(report.reportedId),
                                            style: ElevatedButton.styleFrom(
                                              backgroundColor: Colors.redAccent,
                                              foregroundColor: Colors.white,
                                              minimumSize: const Size(80, 36),
                                            ),
                                            child: const Text('Suspend'),
                                          ),
                                        ],
                                      ],
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
